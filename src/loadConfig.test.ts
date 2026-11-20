import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import loadConfig from "./loadConfig";

let dir: string;
let configHome: string;
const originalXdg = process.env.XDG_CONFIG_HOME;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "runpad-config-"));
  // Keep the real ~/.config out of tests.
  configHome = await mkdtemp(join(tmpdir(), "runpad-home-"));
  process.env.XDG_CONFIG_HOME = configHome;
});

afterEach(async () => {
  if (originalXdg === undefined) {
    delete process.env.XDG_CONFIG_HOME;
  } else {
    process.env.XDG_CONFIG_HOME = originalXdg;
  }
  await rm(dir, { recursive: true, force: true });
  await rm(configHome, { recursive: true, force: true });
});

const writeShared = (content: unknown) =>
  writeFile(
    join(dir, "runpad.config.json"),
    typeof content === "string" ? content : JSON.stringify(content),
  );

const writeFavorites = async (favorites: unknown) => {
  await mkdir(join(configHome, "runpad"), { recursive: true });
  await writeFile(
    join(configHome, "runpad", "favorites.json"),
    JSON.stringify({ [dir]: favorites }),
  );
};

const defaults = { scripts: { hidden: [], pinned: [], favorites: [] } };
const api = { package: "apps/api", script: "start" };
const web = { package: "apps/web", script: "start" };
// The same refs as written in runpad.config.json.
const apiRef = { package: "apps/api", scripts: ["start"] };
const webRef = { package: "apps/web", scripts: ["start"] };

describe("loadConfig", () => {
  test("returns defaults when nothing is configured", async () => {
    expect(await loadConfig(dir)).toEqual(defaults);
  });

  test("returns defaults for an empty object", async () => {
    await writeShared({});
    expect(await loadConfig(dir)).toEqual(defaults);
  });

  test("takes hidden and pinned from shared, favorites from user config", async () => {
    await writeShared({ scripts: { hidden: [webRef], pinned: [apiRef] } });
    await writeFavorites([webRef]);
    expect(await loadConfig(dir)).toEqual({
      scripts: { hidden: [web], pinned: [api], favorites: [web] },
    });
  });

  test("same script can be pinned and favorite", async () => {
    await writeShared({ scripts: { pinned: [apiRef] } });
    await writeFavorites([apiRef]);
    const { scripts } = await loadConfig(dir);
    expect(scripts.pinned).toEqual([api]);
    expect(scripts.favorites).toEqual([api]);
  });
});

describe("script lists", () => {
  test("expands an array of scripts into one ref per script", async () => {
    await writeShared({
      scripts: {
        hidden: [{ package: ".", scripts: ["prepare", "schema"] }],
        pinned: [apiRef, { package: "apps/web", scripts: ["dev", "build"] }],
      },
    });
    expect(await loadConfig(dir)).toEqual({
      scripts: {
        hidden: [
          { package: ".", script: "prepare" },
          { package: ".", script: "schema" },
        ],
        pinned: [
          api,
          { package: "apps/web", script: "dev" },
          { package: "apps/web", script: "build" },
        ],
        favorites: [],
      },
    });
  });

  test("an empty array means no scripts", async () => {
    await writeShared({ scripts: { hidden: [{ package: ".", scripts: [] }] } });
    expect((await loadConfig(dir)).scripts.hidden).toEqual([]);
  });

  test("rejects a single string", async () => {
    await writeShared({
      scripts: { hidden: [{ package: ".", script: "dev" }] },
    });
    await expect(loadConfig(dir)).rejects.toThrow("Invalid runpad.config.json");
  });

  test("rejects the old `script` field", async () => {
    await writeShared({
      scripts: { hidden: [{ package: ".", script: ["dev"] }] },
    });
    await expect(loadConfig(dir)).rejects.toThrow("Invalid runpad.config.json");
  });

  test("rejects non-string items", async () => {
    await writeShared({
      scripts: { hidden: [{ package: ".", scripts: [1] }] },
    });
    await expect(loadConfig(dir)).rejects.toThrow("Invalid runpad.config.json");
  });
});

describe("validation", () => {
  test("rejects string refs", async () => {
    await writeShared({ scripts: { pinned: ["dev"] } });
    await expect(loadConfig(dir)).rejects.toThrow("Invalid runpad.config.json");
  });

  test("rejects string refs in hidden", async () => {
    await writeShared({ scripts: { hidden: ["lint"] } });
    await expect(loadConfig(dir)).rejects.toThrow("Invalid runpad.config.json");
  });

  test("rejects ref without package", async () => {
    await writeShared({ scripts: { pinned: [{ scripts: ["dev"] }] } });
    await expect(loadConfig(dir)).rejects.toThrow("Invalid runpad.config.json");
  });

  test("rejects wrong field type", async () => {
    await writeShared({ scripts: { hidden: "lint" } });
    await expect(loadConfig(dir)).rejects.toThrow("Invalid runpad.config.json");
  });

  test("rejects arrays", async () => {
    await writeShared("[]");
    await expect(loadConfig(dir)).rejects.toThrow("Invalid runpad.config.json");
    await writeShared({ scripts: [] });
    await expect(loadConfig(dir)).rejects.toThrow("Invalid runpad.config.json");
  });

  test("throws on broken JSON", async () => {
    await writeShared("{ nope");
    await expect(loadConfig(dir)).rejects.toThrow("Failed to read");
  });

  test("throws when config path is a directory", async () => {
    await mkdir(join(dir, "runpad.config.json"));
    await expect(loadConfig(dir)).rejects.toThrow("Failed to read");
  });
});
