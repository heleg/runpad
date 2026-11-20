import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import {
  getFavoritesPath,
  loadFavorites,
  saveFavorites,
} from "./favoritesStore";
import loadConfig from "./loadConfig";

let configHome: string;
let project: string;
const originalXdg = process.env.XDG_CONFIG_HOME;

beforeEach(async () => {
  configHome = await mkdtemp(join(tmpdir(), "runpad-home-"));
  project = await mkdtemp(join(tmpdir(), "runpad-project-"));
  process.env.XDG_CONFIG_HOME = configHome;
});

afterEach(async () => {
  if (originalXdg === undefined) {
    delete process.env.XDG_CONFIG_HOME;
  } else {
    process.env.XDG_CONFIG_HOME = originalXdg;
  }
  await rm(configHome, { recursive: true, force: true });
  await rm(project, { recursive: true, force: true });
});

const storePath = () => join(configHome, "runpad", "favorites.json");
const writeStore = async (content: unknown) => {
  await mkdir(join(configHome, "runpad"), { recursive: true });
  await writeFile(
    storePath(),
    typeof content === "string" ? content : JSON.stringify(content),
  );
};
const readStore = async (): Promise<unknown> =>
  JSON.parse(await readFile(storePath(), "utf8"));

const dev = { package: ".", script: "dev" };
const lint = { package: ".", script: "lint" };
// The same favorites as written in the file.
const devGroup = { package: ".", scripts: ["dev"] };
const lintGroup = { package: ".", scripts: ["lint"] };

describe("getFavoritesPath", () => {
  test("uses XDG_CONFIG_HOME when absolute", () => {
    expect(getFavoritesPath()).toBe(storePath());
  });

  test("ignores relative XDG_CONFIG_HOME", () => {
    process.env.XDG_CONFIG_HOME = "relative/dir";
    expect(getFavoritesPath()).toStartWith(homedir());
  });

  test.skipIf(process.platform === "win32")("falls back to ~/.config", () => {
    delete process.env.XDG_CONFIG_HOME;
    expect(getFavoritesPath()).toBe(
      join(homedir(), ".config", "runpad", "favorites.json"),
    );
  });
});

describe("saveFavorites", () => {
  test("creates the file and its directory when missing", async () => {
    saveFavorites(project, [dev]);
    expect(await readStore()).toEqual({ [project]: [devGroup] });
  });

  test("replaces favorites of the project", async () => {
    await writeStore({ [project]: [lintGroup] });
    saveFavorites(project, [dev, lint]);
    expect(await readStore()).toEqual({
      [project]: [{ package: ".", scripts: ["dev", "lint"] }],
    });
  });

  test("keeps other projects untouched, even broken ones", async () => {
    await writeStore({ "/other": [lintGroup], "/broken": "nope" });
    saveFavorites(project, [dev]);
    expect(await readStore()).toEqual({
      "/other": [lintGroup],
      "/broken": "nope",
      [project]: [devGroup],
    });
  });

  test("drops the project entry when the list becomes empty", async () => {
    await writeStore({ "/other": [lintGroup], [project]: [devGroup] });
    saveFavorites(project, []);
    expect(await readStore()).toEqual({ "/other": [lintGroup] });
  });

  test("writes formatted JSON with trailing newline, no temp files", async () => {
    saveFavorites(project, [dev]);
    expect(await readFile(storePath(), "utf8")).toBe(
      `${JSON.stringify({ [project]: [devGroup] }, null, 2)}\n`,
    );
    expect(await readdir(join(configHome, "runpad"))).toEqual([
      "favorites.json",
    ]);
  });

  test("throws on broken JSON and leaves the file as is", async () => {
    await writeStore("{ nope");
    expect(() => saveFavorites(project, [dev])).toThrow("Failed to read");
    expect(await readFile(storePath(), "utf8")).toBe("{ nope");
  });

  test("throws when the file is not an object", async () => {
    await writeStore("[]");
    expect(() => saveFavorites(project, [dev])).toThrow("expected object");
  });

  test("groups neighbours of one package, keeping the order", async () => {
    const web = (script: string) => ({ package: "apps/web", script });
    saveFavorites(project, [dev, web("dev"), web("build"), lint]);
    expect(await readStore()).toEqual({
      [project]: [
        devGroup,
        { package: "apps/web", scripts: ["dev", "build"] },
        lintGroup,
      ],
    });
    expect(await loadFavorites(project)).toEqual([
      dev,
      web("dev"),
      web("build"),
      lint,
    ]);
  });

  test("does not touch the project directory", async () => {
    saveFavorites(project, [dev]);
    expect(await readdir(project)).toEqual([]);
  });
});

describe("loadFavorites", () => {
  test("returns [] when the file is missing", async () => {
    expect(await loadFavorites(project)).toEqual([]);
  });

  test("returns [] when the project has no entry", async () => {
    await writeStore({ "/other": [lintGroup] });
    expect(await loadFavorites(project)).toEqual([]);
  });

  test("ignores broken entries of other projects", async () => {
    await writeStore({ "/broken": "nope", [project]: [devGroup] });
    expect(await loadFavorites(project)).toEqual([dev]);
  });

  test("rejects the old single-script format", async () => {
    await writeStore({ [project]: [dev] });
    await expect(loadFavorites(project)).rejects.toThrow(
      `Invalid favorites of ${project}`,
    );
  });

  test("rejects an invalid entry of the project", async () => {
    await writeStore({ [project]: [{ scripts: ["dev"] }] });
    await expect(loadFavorites(project)).rejects.toThrow(
      `Invalid favorites of ${project}`,
    );
  });

  test("rejects a non-object file", async () => {
    await writeStore("[]");
    await expect(loadFavorites(project)).rejects.toThrow("expected object");
  });

  test("throws on broken JSON", async () => {
    await writeStore("{ nope");
    await expect(loadFavorites(project)).rejects.toThrow("Failed to read");
  });

  test("round-trips through loadConfig", async () => {
    saveFavorites(project, [dev]);
    expect(await loadConfig(project)).toEqual({
      scripts: { hidden: [], pinned: [], favorites: [dev] },
    });
  });
});
