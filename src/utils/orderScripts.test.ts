import { describe, expect, test } from "bun:test";

import orderScripts from "./orderScripts";

const scripts = {
  build: "tsdown",
  dev: "bun run src/index.ts",
  lint: "oxlint",
  test: "bun test",
};

const names = (entries: ReturnType<typeof orderScripts>) =>
  entries.map((entry) => entry.name);

describe("orderScripts", () => {
  test("keeps package.json order without favorites", () => {
    const result = orderScripts(scripts, []);
    expect(names(result)).toEqual(["build", "dev", "lint", "test"]);
    expect(result.every((entry) => !entry.isFavorite)).toBe(true);
  });

  test("puts favorites first in config order", () => {
    const result = orderScripts(scripts, ["test", "dev"]);
    expect(names(result)).toEqual(["test", "dev", "build", "lint"]);
  });

  test("marks only favorites", () => {
    const result = orderScripts(scripts, ["lint"]);
    expect(result.map((entry) => entry.isFavorite)).toEqual([
      true,
      false,
      false,
      false,
    ]);
  });

  test("keeps script commands attached to names", () => {
    const [first] = orderScripts(scripts, ["test"]);
    expect(first).toEqual({
      name: "test",
      script: "bun test",
      isPinned: false,
      isFavorite: true,
      isHidden: false,
    });
  });

  test("ignores favorites missing from scripts", () => {
    const result = orderScripts(scripts, ["deploy", "lint"]);
    expect(names(result)).toEqual(["lint", "build", "dev", "test"]);
  });

  test("ignores duplicate favorites", () => {
    const result = orderScripts(scripts, ["dev", "dev"]);
    expect(names(result)).toEqual(["dev", "build", "lint", "test"]);
  });

  test("does not treat inherited keys as scripts", () => {
    const result = orderScripts(scripts, ["toString"]);
    expect(names(result)).toEqual(["build", "dev", "lint", "test"]);
  });

  test("returns empty list for no scripts", () => {
    expect(orderScripts({}, ["dev"])).toEqual([]);
  });

  describe("with pinned", () => {
    const flags = (entries: ReturnType<typeof orderScripts>) =>
      entries.map(
        (entry) =>
          `${entry.name}${entry.isPinned ? "◆" : ""}${entry.isFavorite ? "★" : ""}${entry.isHidden ? "⊘" : ""}`,
      );

    test("puts favorites before pinned before the rest", () => {
      expect(flags(orderScripts(scripts, ["lint"], ["test", "dev"]))).toEqual([
        "lint★",
        "test◆",
        "dev◆",
        "build",
      ]);
    });

    test("pinned favorite is listed once, in favorites position", () => {
      expect(
        flags(orderScripts(scripts, ["lint", "dev"], ["test", "dev"])),
      ).toEqual(["lint★", "dev◆★", "test◆", "build"]);
    });

    describe("with hidden", () => {
      test("leaves hidden scripts out", () => {
        expect(flags(orderScripts(scripts, [], [], ["lint", "dev"]))).toEqual([
          "build",
          "test",
        ]);
      });

      test("hidden beats pinned", () => {
        expect(
          flags(orderScripts(scripts, [], ["lint", "test"], ["lint"])),
        ).toEqual(["test◆", "build", "dev"]);
      });

      test("favorite beats hidden", () => {
        expect(flags(orderScripts(scripts, ["lint"], [], ["lint"]))).toEqual([
          "lint★",
          "build",
          "dev",
          "test",
        ]);
      });

      test("pinned, hidden and favorite shows as favorite only", () => {
        expect(
          flags(orderScripts(scripts, ["lint"], ["lint"], ["lint"])),
        ).toEqual(["lint★", "build", "dev", "test"]);
      });

      describe("showing hidden", () => {
        test("lists hidden in place, flagged", () => {
          expect(
            flags(orderScripts(scripts, [], [], ["lint", "dev"], true)),
          ).toEqual(["build", "dev⊘", "lint⊘", "test"]);
        });

        test("hidden pinned is pinned again, flagged", () => {
          expect(
            flags(orderScripts(scripts, [], ["lint", "test"], ["lint"], true)),
          ).toEqual(["lint◆⊘", "test◆", "build", "dev"]);
        });

        test("favorite is never flagged hidden", () => {
          expect(
            flags(orderScripts(scripts, ["lint"], ["lint"], ["lint"], true)),
          ).toEqual(["lint◆★", "build", "dev", "test"]);
        });

        test("without hidden in config changes nothing", () => {
          expect(
            flags(orderScripts(scripts, ["test"], ["dev"], [], true)),
          ).toEqual(flags(orderScripts(scripts, ["test"], ["dev"], [], false)));
        });
      });

      test("ignores hidden names missing from scripts", () => {
        expect(names(orderScripts(scripts, [], [], ["deploy"]))).toEqual([
          "build",
          "dev",
          "lint",
          "test",
        ]);
      });
    });

    test("ignores pinned names missing from scripts", () => {
      expect(names(orderScripts(scripts, [], ["deploy"]))).toEqual([
        "build",
        "dev",
        "lint",
        "test",
      ]);
    });
  });
});
