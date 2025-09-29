import { describe, expect, test } from "vitest";
import { decodeCron } from "./decoder";
import { SPECIAL_FIELD_TRANSLATIONS_MAP } from "./constants";

describe("decodeCron()", () => {
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
        expected: "At minute 1, 2, and 5.",
      },
      {
        input: "2,* * * * *",
        expected: "At minute 2, and every minute.",
      },
      {
        input: "*,9 * * * *",
        expected: "At every minute, and 9.",
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
        expected: "At every minute past hour 1, 2, and 5.",
      },
      {
        input: "* 2,* * * *",
        expected: "At every minute past hour 2, and every hour.",
      },
      {
        input: "* *,9 * * *",
        expected: "At every minute past every hour, and 9.",
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
      // other time cases where minute and hour are combinations of all types other than any
      {
        input: "5 14 * * *",
        expected: "At 14:05.",
      },
      {
        input: "5 1,5,9 * * *",
        expected: "At minute 5 past hour 1, 5, and 9.",
      },
      {
        input: "5 2,* * * *",
        expected: "At minute 5 past hour 2, and every hour.",
      },
      {
        input: "5 *,9 * * *",
        expected: "At minute 5 past every hour, and 9.",
      },
      {
        input: "5 */26 * * *",
        expected: "At minute 5 past every 26th hour.",
      },
      {
        input: "5 7/29 * * *",
        expected: "At minute 5 past every 29th hour from 7 through 23.",
      },
      {
        input: "5 6-20 * * *",
        expected: "At minute 5 past every hour from 6 through 20.",
      },
      {
        input: "5 6-20/33 * * *",
        expected: "At minute 5 past every 33rd hour from 6 through 20.",
      },
      {
        input: "1,2 5,6 * * *",
        expected: "At minute 1, and 2 past hour 5, and 6.",
      },
      // cases with day of month, month and day of week
      {
        input: "5 4 * * sun",
        expected: "At 04:05, on Sunday.",
      },
      {
        input: "0 0,12 1 */2 *",
        expected:
          "At minute 0 past hour 0, and 12, in every 2nd month, on the 1st.",
      },
      {
        input: "5 0 * 8 *",
        expected: "At 00:05, in August.",
      },
      {
        input: "15 14 1 * *",
        expected: "At 14:15, on the 1st.",
      },
    ];

    const cases = [
      ...specialCases,
      ...timeRelatedCases,
      // complex cases
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

  describe("invalid expression", () => {
    const cases = ["1, 5,6 * * *"];

    test.each(cases)("it should throw an error", (cs) => {
      expect(() => decodeCron(cs)).toThrowError(
        new Error("invalid cron expression")
      );
    });
  });
});
