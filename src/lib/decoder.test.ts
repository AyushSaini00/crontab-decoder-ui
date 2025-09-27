import { describe, expect, test } from "vitest";
import { SPECIAL_FIELDS, validateCron } from "./decoder";

describe("validateCron", () => {
  describe("invalid expressions", () => {
    const invalidCases = [
      { input: "", reason: "empty string" },
      { input: "   ", reason: "whitespace only" },
      { input: "*", reason: "too few fields" },
      { input: "* * * * * something", reason: "too many fields" },
      { input: "* * * *", reason: "missing day field" },
      { input: "60 * * * *", reason: "invalid minute" },
      { input: "* 25 * * *", reason: "invalid hour" },
    ];

    test.each(invalidCases)(
      "should return false for $input ($reason)",
      ({ input }) => {
        expect(validateCron(input)).toBe(false);
      }
    );
  });

  describe("valid expressions", () => {
    const validCases = [
      ...SPECIAL_FIELDS,
      "* * * * *",
      "0 9 * * 1",
      "*/15 * * * *",
      "0 9-17 * * 1-5",
      "0,30 * * * *",
    ];

    test.each(validCases)("should return true for %s", (input) => {
      expect(validateCron(input)).toBe(true);
    });
  });
});
