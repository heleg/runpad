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

const defaults = {
  scripts: {
    hidden: [],
    pinned: [],
    favorites: [],
    confirm: [],
    descriptions: [],
  },
  viewer: {},
};
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
      scripts: {
        hidden: [web],
        pinned: [api],
        favorites: [web],
        confirm: [],
        descriptions: [],
      },
      viewer: {},
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

describe("confirm", () => {
  test("expands groups into one ref per script", async () => {
    await writeShared({
      scripts: {
        confirm: [{ package: "packages/db", scripts: ["reset", "clear"] }],
      },
    });
    expect((await loadConfig(dir)).scripts.confirm).toEqual([
      { package: "packages/db", script: "reset" },
      { package: "packages/db", script: "clear" },
    ]);
  });
});

describe("viewer", () => {
  test("reads the details width", async () => {
    await writeShared({ viewer: { detailsWidth: 120 } });
    expect((await loadConfig(dir)).viewer).toEqual({ detailsWidth: 120 });
  });

  test("rejects a width too narrow to read", async () => {
    await writeShared({ viewer: { detailsWidth: 10 } });
    await expect(loadConfig(dir)).rejects.toThrow("Invalid");
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
        confirm: [],
        descriptions: [],
      },
      viewer: {},
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

describe("descriptions", () => {
  test("reads one entry per script", async () => {
    const start = { package: ".", script: "start", description: "Something" };
    await writeShared({ scripts: { descriptions: [start] } });
    expect((await loadConfig(dir)).scripts.descriptions).toEqual([start]);
  });

  test("reads detailsFile relative to the config root", async () => {
    await mkdir(join(dir, "docs"));
    await writeFile(join(dir, "docs", "start.md"), "# Start\n");
    await writeShared({
      scripts: {
        descriptions: [
          { package: ".", script: "start", detailsFile: "docs/start.md" },
        ],
      },
    });
    expect((await loadConfig(dir)).scripts.descriptions).toEqual([
      {
        package: ".",
        script: "start",
        detailsFile: "docs/start.md",
        details: "# Start\n",
      },
    ]);
  });

  test("shows a missing detailsFile instead of failing", async () => {
    await writeShared({
      scripts: {
        descriptions: [
          { package: ".", script: "start", detailsFile: "docs/nope.md" },
        ],
      },
    });
    const [entry] = (await loadConfig(dir)).scripts.descriptions;
    expect(entry?.details).toContain("docs/nope.md");
    expect(entry?.details).toContain("ENOENT");
  });

  test("rejects an entry without description and detailsFile", async () => {
    await writeShared({
      scripts: { descriptions: [{ package: ".", script: "start" }] },
    });
    await expect(loadConfig(dir)).rejects.toThrow("Invalid runpad.config.json");
  });

  test("rejects a scripts array", async () => {
    await writeShared({
      scripts: {
        descriptions: [{ package: ".", scripts: ["start"], description: "x" }],
      },
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

describe("YAML", () => {
  const writeConfig = (fileName: string, text: string) =>
    writeFile(join(dir, fileName), text);

  test("reads runpad.config.yaml", async () => {
    await writeConfig(
      "runpad.config.yaml",
      "scripts:\n  pinned:\n    - package: apps/api\n      scripts: [start]\n",
    );
    expect((await loadConfig(dir)).scripts.pinned).toEqual([api]);
  });

  test("reads runpad.config.yml", async () => {
    await writeConfig(
      "runpad.config.yml",
      "scripts:\n  hidden:\n    - package: apps/web\n      scripts: [start]\n",
    );
    expect((await loadConfig(dir)).scripts.hidden).toEqual([web]);
  });

  test("shares fields between entries with anchors and merge keys", async () => {
    await writeConfig(
      "runpad.config.yaml",
      [
        "scripts:",
        "  descriptions:",
        "    - &reset",
        "      package: packages/db",
        "      script: db:reset",
        "      description: Drop and restore",
        "    - <<: *reset",
        "      package: .",
        "",
      ].join("\n"),
    );
    expect((await loadConfig(dir)).scripts.descriptions).toEqual([
      {
        package: "packages/db",
        script: "db:reset",
        description: "Drop and restore",
      },
      { package: ".", script: "db:reset", description: "Drop and restore" },
    ]);
  });

  test("a file with only comments is an empty config", async () => {
    await writeConfig("runpad.config.yaml", "# nothing yet\n");
    expect(await loadConfig(dir)).toEqual(defaults);
  });

  test("throws on broken YAML", async () => {
    await writeConfig("runpad.config.yaml", "scripts: [unclosed\n");
    await expect(loadConfig(dir)).rejects.toThrow("Failed to read");
  });

  test("validates YAML like JSON", async () => {
    await writeConfig("runpad.config.yaml", "scripts:\n  hidden: lint\n");
    await expect(loadConfig(dir)).rejects.toThrow("Invalid runpad.config.yaml");
  });

  test("rejects several config files", async () => {
    await writeShared({});
    await writeConfig("runpad.config.yaml", "scripts: {}\n");
    await expect(loadConfig(dir)).rejects.toThrow(
      "Found runpad.config.yaml and runpad.config.json",
    );
  });
});
