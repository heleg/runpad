import { describe, expect, test } from "bun:test";

import formatError from "./formatError";

describe("formatError", () => {
  test("error without cause", () => {
    expect(formatError(new Error("No package.json found"))).toEqual({
      message: "No package.json found",
    });
  });

  test("error with an Error cause", () => {
    const cause = new SyntaxError("Unexpected token n in JSON");
    expect(
      formatError(new Error("Failed to read runpad.config.json", { cause })),
    ).toEqual({
      message: "Failed to read runpad.config.json",
      detail: "Unexpected token n in JSON",
    });
  });

  test("error with a non-Error cause", () => {
    expect(formatError(new Error("Failed", { cause: "EACCES" }))).toEqual({
      message: "Failed",
      detail: "EACCES",
    });
  });

  test("error with an empty cause message has no detail", () => {
    expect(formatError(new Error("Failed", { cause: new Error("") }))).toEqual({
      message: "Failed",
    });
  });

  test("thrown non-Error values", () => {
    expect(formatError("boom")).toEqual({ message: "boom" });
    expect(formatError(undefined)).toEqual({ message: "undefined" });
  });
});
