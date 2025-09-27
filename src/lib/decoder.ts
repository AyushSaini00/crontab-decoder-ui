import type { FieldType } from "./constants";
import { SPECIAL_FIELD_TRANSLATIONS_MAP, SPECIAL_FIELDS } from "./constants";
import { getFieldType } from "./validator";

// use this after validateCron
export const decodeCron = (cronExpr: string): string | undefined => {
  // clean the user input
  const parts = cronExpr.trim().split(/\s+/);

  const [first, ..._] = parts;
  if (!first) return;

  if (isSpecialField(first)) {
    return SPECIAL_FIELD_TRANSLATIONS_MAP[first];
  }

  if (parts.length !== 5) return;

  let decoded = "";
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const type = getFieldType(i);

    decoded += decodeField(part, type);
  }

  return decoded;
};

const isSpecialField = (
  field: string
): field is keyof typeof SPECIAL_FIELD_TRANSLATIONS_MAP => {
  return SPECIAL_FIELDS.includes(field as (typeof SPECIAL_FIELDS)[number]);
};

let decoded = {
  minute: "",
  hour: "",
  dayOfMonth: "",
  month: "",
  dayOfWeek: "",
};

const decodeField = (fieldValue: string, fieldType: FieldType) => {
  const tokens = fieldValue.split(",");

  //   switch (fieldType) {
  //     case "minute":
  //       if (fieldValue === "*") {
  //         decoded.minute = "every minute";
  //       } else if (fieldValue.startsWith("*/")) {
  //         const n = fieldValue.split("*/")[1];
  //         decoded.minute = `every ${n} minutes`;
  //       } else if (fieldValue.startsWith("*,")) {
  //         const n = fieldValue.split("*,")[1];
  //       }

  //       break;

  //     case "hour":
  //       if (fieldValue === "*") {
  //         decoded.hour = "every hour";
  //       }
  //       break;

  //     case "dayOfMonth":
  //       if (fieldValue === "*") {
  //         decoded.dayOfMonth = "every day";
  //       }
  //       break;

  //     case "month":
  //       if (fieldValue === "*") {
  //         decoded.month = "every month";
  //       }
  //       break;

  //     case "dayOfWeek":
  //       if (fieldValue === "*") {
  //         decoded.dayOfWeek = "every day of the week";
  //       }
  //       break;

  //     default:
  //       console.log("oops");
  //       break;
  //   }

  //   console.log("HELLO", decoded);
};
