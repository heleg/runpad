import { describe, expect, test } from "bun:test";

import isPartOfWorkspace from "./isPartOfWorkspace";
import toWorkspacePatterns from "./utils/toWorkspacePatterns";

const isMember = (raw: string[], path: string) =>
  isPartOfWorkspace({
    patterns: toWorkspacePatterns(raw),
    root: "/repo",
    cwd: `/repo/${path}`,
  });

describe("isPartOfWorkspace", () => {
  // [patterns as written in config, matching paths, non-matching paths]
  test.each<[string[], string[], string[]]>([
    [["packages/api"], ["packages/api"], ["packages/web"]],
    [
      ["packages/*"],
      ["packages/api", "packages/web"],
      ["packages/backend/api"],
    ],
    [["packages/*/*"], ["packages/backend/api"], ["packages/api"]],
    [
      ["packages/**/*"],
      ["packages/api", "packages/backend/api", "packages/a/b/c"],
      ["apps/web"],
    ],
    [["packages/plugin-*"], ["packages/plugin-a"], ["packages/api"]],
    [["packages/plugin-?"], ["packages/plugin-a"], ["packages/plugin-ab"]],
    [["packages/plugin-[a-c]"], ["packages/plugin-b"], ["packages/plugin-d"]],
    [["{apps,packages}/*"], ["apps/web", "packages/api"], ["tools/cli"]],
    [["packages/plugin-{1..3}"], ["packages/plugin-2"], ["packages/plugin-4"]],
    [["packages/@(api|web)"], ["packages/web"], ["packages/docs"]],
    [["packages/!(internal)"], ["packages/api"], ["packages/internal"]],
    [["!(tools)/*"], ["packages/api"], ["tools/cli"]],
  ])("%j", (patterns, members, others) => {
    for (const path of members) {
      expect({ path, member: isMember(patterns, path) }).toEqual({
        path,
        member: true,
      });
    }
    for (const path of others) {
      expect({ path, member: isMember(patterns, path) }).toEqual({
        path,
        member: false,
      });
    }
  });

  test.each([
    "./packages/*",
    ".//packages/*",
    "packages//*",
    "packages/*/",
    "./packages/*/",
  ])("accepts %p like packages/*", (pattern) => {
    expect(isMember([pattern], "packages/api")).toBe(true);
    expect(isMember([pattern], "packages/backend/api")).toBe(false);
  });

  describe("exclusions", () => {
    test.each([
      "!packages/internal",
      "!./packages/internal",
      "!packages/internal/",
    ])("%p excludes packages/internal", (exclusion) => {
      expect(isMember(["packages/*", exclusion], "packages/internal")).toBe(
        false,
      );
      expect(isMember(["packages/*", exclusion], "packages/api")).toBe(true);
    });

    test("exclusion wins regardless of order", () => {
      expect(
        isMember(["!packages/internal", "packages/*"], "packages/internal"),
      ).toBe(false);
    });

    test("recursive exclusion", () => {
      const patterns = ["packages/**", "!packages/**/fixtures/**"];
      expect(isMember(patterns, "packages/api")).toBe(true);
      // minimatch: a trailing `**` needs at least one segment, so the
      // `fixtures` directory itself is not excluded, only what is inside.
      expect(isMember(patterns, "packages/api/fixtures")).toBe(true);
      expect(isMember(patterns, "packages/api/fixtures/demo")).toBe(false);
    });

    test("exclusion alone includes nothing", () => {
      expect(isMember(["!packages/internal"], "packages/api")).toBe(false);
    });
  });

  test("workspace root is not its own member", () => {
    expect(
      isPartOfWorkspace({
        patterns: toWorkspacePatterns(["**"]),
        root: "/repo",
        cwd: "/repo",
      }),
    ).toBe(false);
  });
});
