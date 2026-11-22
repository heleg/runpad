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

import { getHistoryPath, loadLastRun, saveLastRun } from "./historyStore";

let stateHome: string;
const originalXdg = process.env.XDG_STATE_HOME;

beforeEach(async () => {
  stateHome = await mkdtemp(join(tmpdir(), "runpad-state-"));
  process.env.XDG_STATE_HOME = stateHome;
});

afterEach(async () => {
  if (originalXdg === undefined) {
    delete process.env.XDG_STATE_HOME;
  } else {
    process.env.XDG_STATE_HOME = originalXdg;
  }
  await rm(stateHome, { recursive: true, force: true });
});

const storePath = () => join(stateHome, "runpad", "history.json");
const writeStore = async (content: string) => {
  await mkdir(join(stateHome, "runpad"), { recursive: true });
  await writeFile(storePath(), content);
};

const dev = { package: "apps/web", script: "dev" };

describe("getHistoryPath", () => {
  test("uses XDG_STATE_HOME when absolute", () => {
    expect(getHistoryPath()).toBe(storePath());
  });

  test("falls back to ~/.local/state for a relative XDG_STATE_HOME", () => {
    process.env.XDG_STATE_HOME = "state";
    if (process.platform !== "win32") {
      expect(getHistoryPath()).toBe(
        join(homedir(), ".local", "state", "runpad", "history.json"),
      );
    }
  });
});

describe("history", () => {
  test("round-trips the last run of a project", () => {
    saveLastRun("/a", dev);
    expect(loadLastRun("/a")).toEqual(dev);
    expect(loadLastRun("/b")).toBeUndefined();
  });

  test("keeps other projects and replaces the project's entry", async () => {
    saveLastRun("/a", dev);
    saveLastRun("/b", { package: ".", script: "build" });
    saveLastRun("/a", { package: ".", script: "lint" });
    expect(JSON.parse(await readFile(storePath(), "utf8"))).toEqual({
      "/a": { lastRun: { package: ".", script: "lint" } },
      "/b": { lastRun: { package: ".", script: "build" } },
    });
    expect(await readdir(join(stateHome, "runpad"))).toEqual(["history.json"]);
  });

  test("returns nothing when the file is missing or broken", async () => {
    expect(loadLastRun("/a")).toBeUndefined();
    await writeStore("{ nope");
    expect(loadLastRun("/a")).toBeUndefined();
    await writeStore(JSON.stringify({ "/a": { lastRun: "dev" } }));
    expect(loadLastRun("/a")).toBeUndefined();
  });

  test("replaces a broken file on save", async () => {
    await writeStore("{ nope");
    saveLastRun("/a", dev);
    expect(loadLastRun("/a")).toEqual(dev);
  });
});
