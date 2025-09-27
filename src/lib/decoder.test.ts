import { describe, expect, test } from "vitest";
import { SPECIAL_FIELDS, validateCron } from "./decoder";

describe("validateCron()", () => {
  describe("invalid expressions", () => {
    const cases = [
      { input: "", reason: "empty string" },
      { input: "   ", reason: "whitespace only" },
      { input: "*", reason: "too few fields" },
      { input: "* * * * * something", reason: "too many fields" },
      { input: "* * * *", reason: "missing day field" },
      { input: "60 * * * *", reason: "invalid minute" },
      { input: "* 25 * * *", reason: "invalid hour" },

      { input: "7,9-12,3-2/* * * jan-apr/14,3 2", reason: "invalid minute" },
      { input: "7,9-12,3-2/1 * * jan-apr/14,3 2", reason: "invalid minute" },
      { input: "0-6 * * * fri-4", reson: "" },
    ];

    test.each(cases)(
      "it should return false for $input ($reason)",
      ({ input }) => {
        expect(validateCron(input)).toBe(false);
      }
    );
  });

  describe("valid expressions", () => {
    const cases = [
      ...SPECIAL_FIELDS,
      "* * * * *",
      "0 9 * * 1",
      "*/15 * * * *",
      "0 9-17 * * 1-5",
      "0,30 * * * *",

      "7,9-12,3-3/1 * * jan-apr/dec,3 2",
      "7,9-12,3-3/1 * * jan-apr/14,3 2",
      "7,9-12,0/4 * * jan-apr,MAR/14,3 2",
      "0-6 * * * fri-6",
    ];

    test.each(cases)("it should return true for %s", (input) => {
      expect(validateCron(input)).toBe(true);
    });
  });
});
