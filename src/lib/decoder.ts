import type { FieldType } from "./constants";
import {
  ALLOWED_SINGLE_VALUES,
  DAYS_MAP,
  MONTHS_MAP,
  SPECIAL_FIELD_TRANSLATIONS_MAP,
  SPECIAL_FIELDS,
} from "./constants";

type ParsedValue = {
  numeric: number;
  display: string; // value to use to display message for end-user
};

type FieldDescription = {
  type:
    | "any" // * -> "every minute"
    | "specific" // 5 -> "minute 5" (single value) | 1,3,7 -> "minute 1, 3, and 7" (multiple values)
    | "any_with_specific" // 1,* -> "minute 1 and every minute" | *,3,4 -> "every minute, 3, and 4"
    | "every" // */15 -> "every 15th minute"
    | "from_step" // 5/10 -> "every 10th minute from 5 through 59"
    | "range" // 1-5 -> "every minute from 1 through 5"
    | "range_step"; // 2-10/3 -> "every 3rd minute from 2 through 10"
  values: ParsedValue[];
  step: number | null;
};

// use this after validateCron
export const decodeCron = (cronExpr: string): string | undefined => {
  const parts = cronExpr.trim().split(/\s+/);
  const first = parts[0]!;

  if (isSpecialField(first)) {
    return SPECIAL_FIELD_TRANSLATIONS_MAP[first];
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  const minuteDesc = decodeField(minute!, "minute");
  const hourDesc = decodeField(hour!, "minute");
  const dayOfMonthDesc = decodeField(dayOfMonth!, "minute");
  const monthDesc = decodeField(month!, "minute");
  const dayOfWeekDesc = decodeField(dayOfWeek!, "minute");

  return buildHumanDescription(
    minuteDesc,
    hourDesc,
    dayOfMonthDesc,
    monthDesc,
    dayOfWeekDesc
  );
};

const decodeField = (
  fieldValue: string,
  fieldType: FieldType
): FieldDescription => {
  if (fieldValue === "*") {
    return { type: "any", values: [], step: null };
  }

  const tokens = fieldValue.split(",");
  const descriptions: FieldDescription[] = [];

  for (const token of tokens) {
    if (token.includes("/")) {
      descriptions.push(decodeStep(token, fieldType));
    } else if (token.includes("-")) {
      descriptions.push(decodeRange(token, fieldType));
    } else {
      descriptions.push(decodeSingle(token, fieldType));
    }
  }

  if (descriptions.length === 1) return descriptions[0]!;

  // has any token
  const hasAnyToken = descriptions.find((desc) => desc.type === "any");
  if (hasAnyToken) {
    const allValues = descriptions.flatMap((desc) => desc.values);
    return { type: "any_with_specific", values: allValues, step: null };
  }

  const allValues = descriptions.flatMap((desc) => desc.values);
  return { type: "specific", values: allValues, step: null };
};

const decodeStep = (token: string, fieldType: FieldType): FieldDescription => {
  const [base, stepStr] = token.split("/");
  const step = parseInt(stepStr!, 10);

  if (base === "*") {
    return { type: "every", values: [], step };
  }

  if (base!.includes("-")) {
    const range = decodeRange(base!, fieldType);
    return { ...range, type: "range_step", step };
  }

  const startValue = parseSingleValue(base!, fieldType);
  return { type: "from_step", values: [startValue], step };
};

const decodeRange = (token: string, fieldType: FieldType): FieldDescription => {
  const [start, end] = token.split("-");
  const startValue = parseSingleValue(start!, fieldType);
  const endValue = parseSingleValue(end!, fieldType);

  return { type: "range", values: [startValue, endValue], step: null };
};

const decodeSingle = (
  token: string,
  fieldType: FieldType
): FieldDescription => {
  if (token === "*")
    return {
      type: "any",
      values: [{ numeric: NaN, display: `every ${fieldType}` }],
      step: null,
    };

  const value = parseSingleValue(token, fieldType);
  return { type: "specific", values: [value], step: null };
};

const parseSingleValue = (token: string, fieldType: FieldType): ParsedValue => {
  const numValue = parseInt(token, 10);

  if (Number.isInteger(numValue)) {
    return {
      numeric: numValue,
      display: formateNumericValue(numValue, fieldType),
    };
  }

  // handle named values (months/days)
  const upperCasedVal = token.toUpperCase();

  if (fieldType === "month" && upperCasedVal in MONTHS_MAP) {
    const monthIdx = ALLOWED_SINGLE_VALUES.month.indexOf(upperCasedVal);
    return {
      numeric: monthIdx + 1,
      display: MONTHS_MAP[upperCasedVal as keyof typeof MONTHS_MAP],
    };
  }

  if (fieldType === "dayOfWeek" && upperCasedVal in DAYS_MAP) {
    const dayIndex = ALLOWED_SINGLE_VALUES.dayOfWeek.indexOf(upperCasedVal);
    return {
      numeric: dayIndex,
      display: DAYS_MAP[upperCasedVal as keyof typeof DAYS_MAP],
    };
  }

  return {
    numeric: numValue,
    display: token,
  };
};

const formateNumericValue = (num: number, fieldType: FieldType): string => {
  switch (fieldType) {
    case "minute":
      return num.toString();
    case "hour":
      return num.toString();
    case "dayOfMonth":
      return getOrdinal(num);
    case "month":
      const monthFullNames = Object.values(MONTHS_MAP);
      return monthFullNames[num - 1] || num.toString();
    case "dayOfWeek":
      const dayFullNames = Object.values(DAYS_MAP);
      return dayFullNames[num] || num.toString();
    default:
      return num.toString();
  }
};

// to get ordinal indicators : e.g: 1st, 2nd, 3rd,... etc
const getOrdinal = (n: number): string => {
  const ordinalRules = new Intl.PluralRules("en-US", { type: "ordinal" });
  const suffixes = new Map([
    ["one", "st"],
    ["two", "nd"],
    ["few", "rd"],
    ["other", "th"],
  ]);

  const rule = ordinalRules.select(n);
  const suffix = suffixes.get(rule);

  return `${n}${suffix}`;
};

const buildHumanDescription = (
  minute: FieldDescription,
  hour: FieldDescription,
  dayOfMonth: FieldDescription,
  month: FieldDescription,
  dayOfWeek: FieldDescription
): string => {
  let description = "At ";

  // handling time (minute & hour)
  if (hour.type === "any") {
    switch (minute.type) {
      case "any":
        description += "every minute";
        break;
      case "specific":
        const specificValues = minute.values.map((v) => v.display).join(", ");
        description += `minute ${specificValues}`;
        break;
      case "any_with_specific":
        const idxOfAnyValue = minute.values.findIndex(
          (v) => v.display === `every minute`
        );
        const values = minute.values.map((v) => v.display);

        if (idxOfAnyValue === 0) {
          const [_, ...restValues] = values;
          description += `every minute, ${restValues.join(", ")}`;
        } else {
          description += `minute ${values.join(", ")}`;
        }
        break;
      case "every":
        description += `every ${getOrdinal(minute.step!)} minute`;
        break;
      case "from_step":
        description += `every ${getOrdinal(minute.step!)} minute from ${
          minute.values[0]?.display
        } through 59`;
        break;
      case "range":
        description += `every minute from ${minute.values[0]?.display} through ${minute.values[1]?.display}`;
        break;
      case "range_step":
        description += `every ${getOrdinal(minute.step!)} minute from ${
          minute.values[0]?.display
        } through ${minute.values[1]?.display}`;
        break;
    }
  }

  return description + ".";
};

const isSpecialField = (
  field: string
): field is keyof typeof SPECIAL_FIELD_TRANSLATIONS_MAP => {
  return SPECIAL_FIELDS.includes(field as (typeof SPECIAL_FIELDS)[number]);
};
