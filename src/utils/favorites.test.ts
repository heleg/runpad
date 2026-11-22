import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import {
  descriptionFor,
  favoritesFor,
  resolveFavorites,
  toggleFavorite,
  toPackageKey,
  withoutRefs,
} from "./favorites";

describe("toPackageKey", () => {
  test("returns '.' for the root itself", () => {
    expect(toPackageKey("/repo", "/repo")).toBe(".");
  });

  test("returns posix path relative to root", () => {
    expect(toPackageKey("/repo", join("/repo", "apps", "api"))).toBe(
      "apps/api",
    );
  });
});

describe("toggleFavorite", () => {
  const api = { package: "apps/api", script: "start" };
  const web = { package: "apps/web", script: "start" };

  test("appends a new favorite to the end", () => {
    expect(toggleFavorite([api], web)).toEqual([api, web]);
  });

  test("removes an existing favorite by value", () => {
    expect(toggleFavorite([api, web], { ...api })).toEqual([web]);
  });

  test("same script in another package is a different favorite", () => {
    expect(toggleFavorite([api], web)).toHaveLength(2);
  });

  test("does not mutate the input", () => {
    const favorites = [api];
    toggleFavorite(favorites, web);
    expect(favorites).toEqual([api]);
  });
});

describe("favoritesFor", () => {
  test("returns script names of one package in config order", () => {
    const favorites = [
      { package: "apps/api", script: "test" },
      { package: "apps/web", script: "dev" },
      { package: "apps/api", script: "start" },
    ];
    expect(favoritesFor(favorites, "apps/api")).toEqual(["test", "start"]);
    expect(favoritesFor(favorites, ".")).toEqual([]);
  });
});

describe("withoutRefs", () => {
  const api = { package: "apps/api", script: "start" };
  const web = { package: "apps/web", script: "start" };
  const lint = { package: ".", script: "lint" };

  test("removes matching refs by value, keeps order", () => {
    expect(withoutRefs([api, lint, web], [{ ...lint }])).toEqual([api, web]);
  });

  test("same script in another package is kept", () => {
    expect(
      withoutRefs([api, web], [{ package: "apps/api", script: "start" }]),
    ).toEqual([web]);
  });

  test("nothing to remove returns all refs", () => {
    expect(withoutRefs([api, web], [])).toEqual([api, web]);
  });
});

describe("resolveFavorites", () => {
  const packages: { key: string; scripts: Record<string, string> }[] = [
    { key: ".", scripts: { lint: "oxlint" } },
    { key: "apps/api", scripts: { start: "nest start", test: "jest" } },
    { key: "apps/web", scripts: { start: "vite" } },
  ];

  const resolved = (favorites: Parameters<typeof resolveFavorites>[0]) =>
    resolveFavorites(favorites, packages).map(
      ({ pkg, favorite, script }) => `${pkg.key}:${favorite.script}=${script}`,
    );

  test("resolves across packages in config order", () => {
    expect(
      resolved([
        { package: "apps/web", script: "start" },
        { package: ".", script: "lint" },
        { package: "apps/api", script: "start" },
      ]),
    ).toEqual([
      "apps/web:start=vite",
      ".:lint=oxlint",
      "apps/api:start=nest start",
    ]);
  });

  test("skips unknown packages and scripts", () => {
    expect(
      resolved([
        { package: "apps/gone", script: "start" },
        { package: "apps/api", script: "deploy" },
        { package: "apps/api", script: "test" },
      ]),
    ).toEqual(["apps/api:test=jest"]);
  });

  test("skips inherited keys", () => {
    expect(resolved([{ package: ".", script: "toString" }])).toEqual([]);
  });

  test("skips duplicates", () => {
    expect(
      resolved([
        { package: ".", script: "lint" },
        { package: ".", script: "lint" },
      ]),
    ).toEqual([".:lint=oxlint"]);
  });
});

describe("descriptionFor", () => {
  const descriptions = [
    { package: ".", script: "start", description: "Root start" },
    { package: "apps/web", script: "start", description: "Web start" },
    { package: ".", script: "start", description: "Duplicate" },
  ];

  test("matches package and script, first entry wins", () => {
    expect(
      descriptionFor(descriptions, { package: ".", script: "start" })
        ?.description,
    ).toBe("Root start");
    expect(
      descriptionFor(descriptions, { package: "apps/web", script: "start" })
        ?.description,
    ).toBe("Web start");
  });

  test("returns undefined when not described", () => {
    expect(
      descriptionFor(descriptions, { package: "apps/api", script: "start" }),
    ).toBeUndefined();
  });
});
