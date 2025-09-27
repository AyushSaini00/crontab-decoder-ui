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

  parts.forEach((part, idx) => {
    const type = getFieldType(idx);
    if (!validateField(part, type)) return false;
  });

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
      if (!validateStep(token, lowerAllowedRange, upperAllowedRange))
        return false;
    } else if (token.includes("-")) {
      if (!validateRange(token, lowerAllowedRange, upperAllowedRange))
        return false;
    } else {
      if (!validateNum(token, lowerAllowedRange, upperAllowedRange))
        return false;
    }
  }

  return false;
};

const validateStep = (token: string, min: number, max: number): boolean => {
  return false;
};

const validateRange = (token: string, min: number, max: number): boolean => {
  return false;
};

const validateNum = (token: string, min: number, max: number): boolean => {
  return false;
};
