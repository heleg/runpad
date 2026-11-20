import { describe, expect, test } from "bun:test";

import toWorkspacePatterns from "./toWorkspacePatterns";

describe("toWorkspacePatterns", () => {
  test.each([
    ["packages/*", "packages/*"],
    ["./packages/*", "packages/*"],
    ["././packages/*", "packages/*"],
    [".//packages/*", "packages/*"],
    ["packages//*", "packages/*"],
    ["packages/*/", "packages/*"],
    ["./packages/*//", "packages/*"],
    ["./packages/**", "packages/**"],
    ["!(internal)/*", "!(internal)/*"],
    ["packages/!(internal)", "packages/!(internal)"],
    ["./", "."],
    [".", "."],
    ["../shared/*", "../shared/*"],
  ])("include %p as %p", (input, expected) => {
    expect(toWorkspacePatterns([input])).toEqual({
      include: [expected],
      exclude: [],
    });
  });

  test.each([
    ["!packages/internal", "packages/internal"],
    ["!./packages/internal", "packages/internal"],
    ["!packages/internal/", "packages/internal"],
    ["!packages/**/fixtures/**", "packages/**/fixtures/**"],
  ])("exclude %p as %p", (input, expected) => {
    expect(toWorkspacePatterns([input])).toEqual({
      include: [],
      exclude: [expected],
    });
  });

  test("keeps order within include and exclude", () => {
    expect(
      toWorkspacePatterns(["apps/*", "!apps/a", "packages/*", "!packages/b"]),
    ).toEqual({
      include: ["apps/*", "packages/*"],
      exclude: ["apps/a", "packages/b"],
    });
  });

  test("empty list stays empty", () => {
    expect(toWorkspacePatterns([])).toEqual({ include: [], exclude: [] });
  });
});
