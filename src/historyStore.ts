import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";

import * as v from "valibot";
import { attempt } from "withstand";

import { plainObject, type ScriptRef } from "./scriptRef";
import isPlainObject from "./utils/isPlainObject";

/**
 * The last run script of each project, keyed by the absolute path of its
 * config root. It is state, not settings, so it lives apart from favorites:
 *
 * - `$XDG_STATE_HOME/runpad/history.json` when set (any OS);
 * - `%LOCALAPPDATA%\runpad\history.json` on Windows;
 * - `~/.local/state/runpad/history.json` otherwise.
 *
 * Only the package and script name are stored, not the command.
 */
export const getHistoryPath = (): string => {
  const { XDG_STATE_HOME: xdg, LOCALAPPDATA: localAppData } = process.env;
  let base = join(homedir(), ".local", "state");
  if (xdg && isAbsolute(xdg)) {
    base = xdg;
  } else if (process.platform === "win32" && localAppData) {
    base = localAppData;
  }
  return join(base, "runpad", "history.json");
};

const entrySchema = plainObject({
  lastRun: plainObject({ package: v.string(), script: v.string() }),
});

const readStore = (path: string): Record<string, unknown> | undefined => {
  const result = attempt((): unknown => JSON.parse(readFileSync(path, "utf8")));
  return result.ok && isPlainObject(result.value) ? result.value : undefined;
};

/**
 * The script run last in the project, if any. History only picks the
 * starting row, so a missing or broken file never stops RunPad: it just
 * starts as usual.
 */
export const loadLastRun = (rootDir: string): ScriptRef | undefined => {
  const entry = readStore(getHistoryPath())?.[rootDir];
  const result = v.safeParse(entrySchema, entry);
  return result.success ? result.output.lastRun : undefined;
};

/**
 * Remembers the script run last in the project, keeping other projects.
 * A broken file is replaced: it holds nothing worth keeping. Throws if the
 * file can't be written.
 */
export const saveLastRun = (rootDir: string, lastRun: ScriptRef): void => {
  const path = getHistoryPath();
  const store = readStore(path) ?? {};
  const next = {
    ...store,
    [rootDir]: {
      lastRun: { package: lastRun.package, script: lastRun.script },
    },
  };
  mkdirSync(dirname(path), { recursive: true });
  const tempPath = `${path}.${process.pid}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(next, null, 2)}\n`);
  renameSync(tempPath, path);
};
