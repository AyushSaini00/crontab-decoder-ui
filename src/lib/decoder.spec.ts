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

    const timeRelatedCases = [
      // hour type as "any"
      {
        input: "* * * * *",
        expected: "At every minute.",
      },
      {
        input: "5 * * * *",
        expected: "At minute 5.",
      },
      {
        input: "1,2,5 * * * *",
        expected: "At minute 1, 2, 5.",
      },
      {
        input: "2,* * * * *",
        expected: "At minute 2, every minute.",
      },
      {
        input: "*,9 * * * *",
        expected: "At every minute, 9.",
      },
      {
        input: "*/12 * * * *",
        expected: "At every 12th minute.",
      },
      {
        input: "8/2 * * * *",
        expected: "At every 2nd minute from 8 through 59.",
      },
      {
        input: "16-24 * * * *",
        expected: "At every minute from 16 through 24.",
      },
      {
        input: "4-6/3 * * * *",
        expected: "At every 3rd minute from 4 through 6.",
      },
      // minute type as "any"
      {
        input: "* 5 * * *",
        expected: "At every minute past hour 5.",
      },
      {
        input: "* 1,2,5 * * *",
        expected: "At every minute past hour 1, 2, 5.",
      },
      {
        input: "* 2,* * * *",
        expected: "At every minute past hour 2, every hour.",
      },
      {
        input: "* *,9 * * *",
        expected: "At every minute past every hour, 9.",
      },
      {
        input: "* */26 * * *",
        expected: "At every minute past every 26th hour.",
      },
      {
        input: "* 7/29 * * *",
        expected: "At every minute past every 29th hour from 7 through 23.",
      },
      {
        input: "* 6-20 * * *",
        expected: "At every minute past every hour from 6 through 20.",
      },
      {
        input: "* 6-20/33 * * *",
        expected: "At every minute past every 33rd hour from 6 through 20.",
      },
    ];

    const cases = [
      ...specialCases,
      ...timeRelatedCases,
      // {
      //   input: "*,11 * * * *",
      //   expected: "At every minute and 11.",
      // },
      // {
      //   input: "11,* * * * *",
      //   expected: "At minute 11 and every minute.",
      // },
      // {
      //   input: "1,2,* 1,2,* 1,2,* 1,2,* 1,2,*",
      //   expected:
      //     "At minute 1, 2, and every minute past hour 1, 2, and every hour on day-of-month 1, 2, and every day-of-month and on Monday, Tuesday, and every day-of-week in January, February, and every month.",
      // },
    ];

    test.each(cases)(
      "it should return output: $expected for input: $input",
      (cs) => {
        expect(decodeCron(cs.input)).toBe(cs.expected);
      }
    );
  });
});
