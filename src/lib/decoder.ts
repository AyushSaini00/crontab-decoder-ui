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
  const hourDesc = decodeField(hour!, "hour");
  const dayOfMonthDesc = decodeField(dayOfMonth!, "dayOfMonth");
  const monthDesc = decodeField(month!, "month");
  const dayOfWeekDesc = decodeField(dayOfWeek!, "dayOfWeek");

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

  // has any token with specific values
  const hasAnySpecificToken = tokens.length > 1 && tokens.includes("*");

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

  if (hasAnySpecificToken) {
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
  const timePart = buildTimePart(minute, hour);
  const datePart = buildDatePart(dayOfMonth, month, dayOfWeek);

  return `At ${timePart}${datePart ? `, ${datePart}` : ""}.`;
};

const buildTimePart = (
  minute: FieldDescription,
  hour: FieldDescription
): string => {
  const minutePhrase = buildFieldPhrase(minute, "minute");
  const hourPhrase = buildFieldPhrase(hour, "hour");

  if (minute.type === "any" && hour.type === "any") {
    return "every minute";
  }

  if (minute.type === "any") {
    return `every minute past ${hourPhrase}`;
  }

  if (hour.type === "any") {
    return minutePhrase;
  }

  // for single-value specific minute and hour, we would like to format time as HH:MM
  if (
    minute.type === "specific" &&
    minute.values.length === 1 &&
    hour.type === "specific" &&
    hour.values.length === 1
  ) {
    const hourVal = hour.values[0]!;
    const minuteVal = minute.values[0]!;

    const formattedHour =
      hourVal.numeric < 10 ? "0" + hourVal.display : hourVal.display;
    const formattedMinute =
      minuteVal.numeric < 10 ? "0" + minuteVal.display : minuteVal.display;

    return `${formattedHour}:${formattedMinute}`;
  }

  return `${minutePhrase} past ${hourPhrase}`;
};

const buildDatePart = (
  dayOfMonth: FieldDescription,
  month: FieldDescription,
  dayOfWeek: FieldDescription
): string => {
  const parts: string[] = [];

  if (month.type !== "any") {
    const monthPhrase = buildFieldPhrase(month, "month");
    parts.push(`in ${monthPhrase}`);
  }

  if (dayOfMonth.type !== "any") {
    const dayOfMonthPhrase = buildFieldPhrase(dayOfMonth, "dayOfMonth");
    parts.push(`on the ${dayOfMonthPhrase}`);
  }

  if (dayOfWeek.type !== "any") {
    const dayOfWeekPhrase = buildFieldPhrase(dayOfWeek, "dayOfWeek");
    parts.push(`on ${dayOfWeekPhrase}`);
  }

  return parts.join(", ");
};

const buildFieldPhrase = (
  field: FieldDescription,
  fieldType: FieldType
): string => {
  const { type, values, step } = field;

  switch (type) {
    case "any":
      return `every ${fieldType}`;

    case "specific":
      return formatValuesList(values, fieldType);

    case "any_with_specific":
      const idxOfAnyValue = values.findIndex(
        (v) => v.display === `every ${fieldType}`
      );

      if (idxOfAnyValue === 0) {
        return `${joinDisplayValues(values)}`;
      } else {
        return formatValuesList(values, fieldType);
      }

    case "every":
      return `every ${getOrdinal(step!)} ${fieldType}`;

    case "from_step":
      const maxValue = getMaxValueForField(fieldType);
      return `every ${getOrdinal(step!)} ${fieldType} from ${
        values[0]?.display
      } through ${maxValue}`;

    case "range":
      return `every ${fieldType} from ${values[0]?.display} through ${values[1]?.display}`;

    case "range_step":
      return `every ${getOrdinal(step!)} ${fieldType} from ${
        values[0]?.display
      } through ${values[1]?.display}`;

    default:
      return "";
  }
};

const formatValuesList = (
  values: ParsedValue[],
  fieldType: FieldType
): string => {
  if (values.length === 0) return "";

  if (values.length === 1) {
    return addFieldPrefix(values[0]!.display, fieldType);
  }

  const displays = values.map((v) => v.display);
  const last = displays.pop()!;
  const formatted = displays.join(", ");

  return addFieldPrefix(`${formatted}, and ${last}`, fieldType);
};

const joinDisplayValues = (values: ParsedValue[]): string => {
  if (values.length === 0) return "";

  if (values.length === 1) {
    return values[0]!.display;
  }

  const displays = values.map((v) => v.display);
  const last = displays.pop();

  if (displays.length === 1) {
    return `${displays[0]}, and ${last}`;
  }

  return `${displays.join(", ")} and ${last}`;
};

const addFieldPrefix = (valueStr: string, fieldType: FieldType): string => {
  switch (fieldType) {
    case "minute":
      return `minute ${valueStr}`;
    case "hour":
      return `hour ${valueStr}`;
    case "dayOfMonth":
      return valueStr; // already has ordinal format
    case "month":
      return valueStr; // month names
    case "dayOfWeek":
      return valueStr; // day names
    default:
      return valueStr;
  }
};

const getMaxValueForField = (fieldType: FieldType): string => {
  switch (fieldType) {
    case "minute":
      return "59";
    case "hour":
      return "23";
    case "dayOfMonth":
      return getOrdinal(31);
    case "month":
      return "December";
    case "dayOfWeek":
      return "Saturday";
    default:
      return "";
  }
};

const isSpecialField = (
  field: string
): field is keyof typeof SPECIAL_FIELD_TRANSLATIONS_MAP => {
  return SPECIAL_FIELDS.includes(field as (typeof SPECIAL_FIELDS)[number]);
};
