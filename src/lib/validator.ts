import type { FieldType } from "./constants";
import {
  ALLOWED_RANGE,
  ALLOWED_SINGLE_VALUES,
  FIELD_TYPES,
  SPECIAL_FIELDS,
} from "./constants";

export const validateCron = (cronExpr: string): boolean => {
  if (!cronExpr || !cronExpr.trim()) return false;

  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length < 1) return false;

  const first = parts[0];
  if (!first) return false;

  // expr could be special / non-standard
  if (SPECIAL_FIELDS.includes(first as (typeof SPECIAL_FIELDS)[number])) {
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

export const getFieldType = (index: number): FieldType => {
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
        !validateSingleValue(
          token,
          lowerAllowedRange,
          upperAllowedRange,
          allowedSingleValues
        )
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

  // now that we have made sure that second is valid, we can check first
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

  // if both are numbers
  if (isInt(first) && isInt(second)) {
    return (
      Number(first) >= min &&
      Number(second) <= max &&
      Number(second) >= Number(first)
    );
  }

  // if first is num and second is allowed value
  if (isInt(first) && allowedSingleValues?.includes(second.toUpperCase())) {
    const firstNum = Number(first);
    const idx = allowedSingleValues.findIndex(
      (val) => val === second.toUpperCase()
    );

    // in case of months, allowed range is [1, 12], but idx would have range [0, 11] as it's an array
    // to accomodate this we can add low + idx so that direct comparasion can be made.
    const secondNum = idx + min;

    return firstNum >= min && secondNum <= max && secondNum >= firstNum;
  }

  // if first is allowed value and second is num
  if (allowedSingleValues?.includes(first.toUpperCase()) && isInt(second)) {
    const idx = allowedSingleValues.findIndex(
      (val) => val === first.toUpperCase()
    );
    const secondNum = Number(second);
    const firstNum = idx + min;

    return firstNum >= min && secondNum <= max && secondNum >= firstNum;
  }

  // if both are allowed values
  if (
    allowedSingleValues?.includes(first.toUpperCase()) &&
    allowedSingleValues?.includes(second.toUpperCase())
  ) {
    const idx1 = allowedSingleValues.findIndex(
      (val) => val === first.toUpperCase()
    );
    const idx2 = allowedSingleValues.findIndex(
      (val) => val === second.toUpperCase()
    );

    const firstNum = idx1 + min;
    const secondNum = idx2 + min;

    return firstNum >= min && secondNum <= max && secondNum >= firstNum;
  }

  return false;
};

const validateSingleValue = (
  token: string,
  min: number,
  max: number,
  allowedSingleValues: string[] | null
): boolean => {
  if (!token.length) return false; // fixes the case where for eg minute input is "1,2," -> due to trailing comman token would be "" so it should be invalid cron
  if (token === "*") return true; // handles cases like */n or n/*
  if (validateNum(token, min, max)) return true;
  if (allowedSingleValues?.includes(token.toUpperCase())) return true;

  return false;
};

const validateNum = (token: string, min: number, max: number): boolean => {
  const num = Number(token);
  if (!Number.isInteger(num)) return false;

  return num >= min && num <= max;
};

const isInt = (val: string): boolean => {
  const num = Number(val);
  return Number.isInteger(num);
};
