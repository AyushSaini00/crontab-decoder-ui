export const SPECIAL_FIELDS = [
  "@reboot",
  "@yearly",
  "@monthly",
  "@weekly",
  "@daily",
  "@hourly",
] as const;

export const FIELD_TYPES = [
  "minute",
  "hour",
  "dayOfMonth",
  "month",
  "dayOfWeek",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const ALLOWED_RANGE: Record<FieldType, [number, number]> = {
  minute: [0, 59],
  hour: [0, 23],
  dayOfMonth: [1, 31],
  month: [1, 12],
  dayOfWeek: [0, 7],
} as const;

export const ALLOWED_SINGLE_VALUES: Record<
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
} as const;

export const SPECIAL_FIELD_TRANSLATIONS_MAP = {
  "@reboot": "After rebooting.",
  "@yearly": "At 00:00 on day-of-month 1 in January.",
  "@monthly": "At 00:00 on day-of-month 1.",
  "@weekly": "At 00:00 on Sunday.",
  "@daily": "At 00:00.",
  "@hourly": "At minute 0.",
} as const;

export const MONTHS_MAP = {
  JAN: "January",
  FEB: "February",
  MAR: "March",
  APR: "April",
  MAY: "May",
  JUN: "June",
  JUL: "July",
  AUG: "August",
  SEP: "September",
  OCT: "October",
  NOV: "November",
  DEC: "December",
} as const;

export const DAYS_MAP = {
  SUN: "Sunday",
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
} as const;
