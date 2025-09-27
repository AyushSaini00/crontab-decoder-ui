export const SPECIAL_FIELDS = [
  "@reboot",
  "@yearly",
  "@monthly",
  "@weekly",
  "@daily",
  "@hourly",
] as const;

const FIELD_TYPES = [
  "minute",
  "hour",
  "dayOfMonth",
  "month",
  "dayOfWeek",
] as const;

type FieldType = (typeof FIELD_TYPES)[number];

const ALLOWED_RANGE: Record<FieldType, [number, number]> = {
  minute: [0, 59],
  hour: [0, 23],
  dayOfMonth: [1, 31],
  month: [1, 12],
  dayOfWeek: [0, 7],
};

const ALLOWED_SINGLE_VALUES: Record<
  Extract<FieldType, "month" | "dayOfWeek">,
  string[]
> = {
  // lowercase values are also valid for cron, we will do that during parsing
  month: [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ],
  dayOfWeek: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
};

export const validateCron = (cronExpr: string): boolean => {
  if (!cronExpr || !cronExpr.trim()) return false;

  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length < 1) return false;

  const first = parts[0];
  if (!first) return false;

  // expr could be special / non-standard
  if (
    first.startsWith("@") &&
    SPECIAL_FIELDS.includes(first as (typeof SPECIAL_FIELDS)[number])
  ) {
    return true;
  }

  // now that specials are checked
  if (parts.length !== 5) return false;

  for (let idx = 0; idx < parts.length; idx++) {
    const part = parts[idx]!; // Non-null assertion

    const type = getFieldType(idx);
    if (!validateField(part, type)) return false;
  }

  return true;
};

const getFieldType = (index: number): FieldType => {
  if (index < 0 || index >= FIELD_TYPES.length) {
    throw new Error(`Invalid field index: ${index}.`);
  }

  // this is non-null assertion in TS, using it to assert that FIELD_TYPES[index]
  // is non-null because TS complier still believes that FIELD_TYPES could be undefined,
  // but we have checked for out of bounds index and FIELD_TYPES is a const.
  // so it's sure that FIELD_TYPES[index] will have the value
  return FIELD_TYPES[index]!;
};

export const validateField = (
  fieldValue: string,
  fieldType: FieldType
): boolean => {
  if (!FIELD_TYPES.includes(fieldType)) return false;

  // some of the examples of values which are accepted:
  // * (any value)
  // 1-25
  // 2,*
  // 1,3,7,8 -> , can be continuos
  // 1-4,9-12 -> - range should be separated by a ,
  // 5,10-15,*/20
  // 2/3
  // */4,1/10 -> / range should be separated by a ,

  // some of the non-valid values are:
  // 1/*
  // 5-*
  // 7,* * * jan-DEC 3

  if (fieldValue === "*") return true;

  const [lowerAllowedRange, upperAllowedRange] = ALLOWED_RANGE[fieldType];

  // allowed only in case of month & dayOfWeek fieldType
  const allowedSingleValues =
    fieldType === "month" || fieldType === "dayOfWeek"
      ? ALLOWED_SINGLE_VALUES[fieldType]
      : null;

  const tokens = fieldValue.split(",");
  for (const token of tokens) {
    if (token.includes("/")) {
      if (
        !validateStep(
          token,
          lowerAllowedRange,
          upperAllowedRange,
          allowedSingleValues
        )
      )
        return false;
    } else if (token.includes("-")) {
      if (
        !validateRange(
          token,
          lowerAllowedRange,
          upperAllowedRange,
          allowedSingleValues
        )
      )
        return false;
    } else {
      if (
        !validateNum(token, lowerAllowedRange, upperAllowedRange) &&
        !allowedSingleValues?.includes(token.toUpperCase())
      )
        return false;
    }
  }

  return true;
};

// */n -> every n units
// a-b/n -> every n units, from a through b
// x/n -> every n units, from x through MAX_OF_RANGE
const validateStep = (
  token: string,
  min: number,
  max: number,
  allowedSingleValues: string[] | null
): boolean => {
  const parts = token.split("/");
  if (parts.length !== 2) return false;

  const [first, second] = parts;
  if (!first || !second) return false;

  // second must either be a positive integer (greator than 0)
  // or any of the allowed single value for supported fieldTypes
  const secondNum = Number(second);
  const isPositiveInt =
    secondNum && secondNum > 0 && Number.isInteger(secondNum);
  const isAllowedVal = allowedSingleValues?.includes(second.toUpperCase());

  if (!isPositiveInt && !isAllowedVal) return false;

  // now that we have made sure that second is valid, we can check firstz
  if (first === "*") return true;

  if (first.includes("-")) {
    return validateRange(first, min, max, allowedSingleValues);
  }

  const firstNum = Number(first);
  if (Number.isInteger(firstNum)) {
    return validateNum(first, min, max);
  }

  if (allowedSingleValues?.includes(first.toUpperCase())) return true;

  return false;
};

// a-b -> from a through b, in case of numbers b >= a,
// in case of allowed single values, same rule will be followed by checking their respective indexes
// for example:
// fri-4 : this is invalid because idx of fri is 5 && 5 > 4

const validateRange = (
  token: string,
  min: number,
  max: number,
  allowedSingleValues: string[] | null
): boolean => {
  const parts = token.split("-");
  if (parts.length !== 2) return false;

  const [first, second] = parts;
  if (!first || !second) return false;

  // both should either be integers in allowed ranges
  // or allowed single values
  // and second >= first
  const isFirstValid =
    isInt(first) || allowedSingleValues?.includes(first.toUpperCase());
  const isSecondValid =
    isInt(second) || allowedSingleValues?.includes(second.toUpperCase());

  if (!isFirstValid && !isSecondValid) return false;

  // these would either be the literal number values or indices of allowed single values
  let firstIdx = Number(first),
    secondIdx = Number(second);

  if (allowedSingleValues?.includes(first.toUpperCase())) {
    const i = allowedSingleValues?.findIndex(
      (el) => el === first.toUpperCase()
    );
    if (i !== -1) firstIdx = i;
  }
  if (allowedSingleValues?.includes(second.toUpperCase())) {
    const i = allowedSingleValues?.findIndex(
      (el) => el === second.toUpperCase()
    );
    if (i !== -1) secondIdx = i;
  }

  return firstIdx >= min && secondIdx <= max && secondIdx >= firstIdx;
};

const validateNum = (token: string, min: number, max: number): boolean => {
  const num = Number(token);
  if (!Number.isInteger(num)) return false;

  return num >= min && num <= max;
};

const isInt = (val: string) => {
  const num = Number(val);
  return Number.isInteger(num);
};

// const isPositiveInt = (val: string) => {
//   const num = Number(val);
//   return isInt(val) && num > 0;
// };
