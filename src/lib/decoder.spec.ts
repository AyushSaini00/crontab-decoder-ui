import { describe, expect, test } from "vitest";
import { decodeCron } from "./decoder";
import { SPECIAL_FIELD_TRANSLATIONS_MAP } from "./constants";

describe("decodeCron()", () => {
  //   describe("invalid expressions", () => {
  //     const cases = [
  //       { input: "", reason: "empty string" },
  //       { input: "   ", reason: "whitespace only" },
  //       { input: "*", reason: "too few fields" },
  //       { input: "* * * * * something", reason: "too many fields" },
  //       { input: "* * * *", reason: "missing day field" },
  //       { input: "60 * * * *", reason: "invalid minute" },
  //       { input: "* 25 * * *", reason: "invalid hour" },

  //       { input: "7,9-12,3-2/* * * jan-apr/14,3 2", reason: "invalid minute" },
  //       { input: "7,9-12,3-2/1 * * jan-apr/14,3 2", reason: "invalid minute" },
  //       { input: "0-6 * * * fri-4", reson: "" },
  //     ];

  //     test.each(cases)(
  //       "it should return false for $input ($reason)",
  //       ({ input }) => {
  //         expect(decodeCron(input)).toBe(false);
  //       }
  //     );
  //   });

  describe("valid expressions", () => {
    const specialCases = Object.entries(SPECIAL_FIELD_TRANSLATIONS_MAP).map(
      ([input, expected]) => ({
        input,
        expected,
      })
    );
    const cases = [
      ...specialCases,
      {
        input: "*,11 * * * *",
        expected: "At every minute and 11.",
      },
      {
        input: "11,* * * * *",
        expected: "At minute 11 and every minute.",
      },
      {
        input: "1,2,* 1,2,* 1,2,* 1,2,* 1,2,*",
        expected:
          "At minute 1, 2, and every minute past hour 1, 2, and every hour on day-of-month 1, 2, and every day-of-month and on Monday, Tuesday, and every day-of-week in January, February, and every month.",
      },
    ];

    test.each(cases)(
      "it should return output: $expected for input: $input",
      (cs) => {
        expect(decodeCron(cs.input)).toBe(cs.expected);
      }
    );
  });
});
