import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";

import * as v from "valibot";
import { attempt, toResult } from "withstand";

import {
  expandGroups,
  type Favorite,
  groupRefs,
  scriptGroupSchema,
} from "./scriptRef";
import isNodeError from "./utils/isNodeError";
import isPlainObject from "./utils/isPlainObject";

/**
 * Favorites are personal, so they live in the user's config directory instead
 * of the project: nothing to add to `.gitignore`. One file holds every
 * project, keyed by the absolute path of its config root.
 *
 * - `$XDG_CONFIG_HOME/runpad/favorites.json` when set (any OS);
 * - `%APPDATA%\runpad\favorites.json` on Windows;
 * - `~/.config/runpad/favorites.json` otherwise, macOS included, as most CLI
 *   tools do there.
 */
export const getFavoritesPath = (): string => {
  const { XDG_CONFIG_HOME: xdg, APPDATA: appData } = process.env;
  let base = join(homedir(), ".config");
  if (xdg && isAbsolute(xdg)) {
    base = xdg;
  } else if (process.platform === "win32" && appData) {
    base = appData;
  }
  return join(base, "runpad", "favorites.json");
};

const favoritesSchema = v.array(scriptGroupSchema);

const validateStore = (value: unknown, path: string) => {
  if (!isPlainObject(value)) {
    throw new Error(`Invalid ${path}: expected object`);
  }
  return value;
};

/**
 * Reads favorites of one project. Only that project's entry is validated, so
 * a broken entry of another project does not stop RunPad here.
 */
export const loadFavorites = async (rootDir: string): Promise<Favorite[]> => {
  const path = getFavoritesPath();
  const readResult = await toResult(
    readFile(path, "utf8").then((text): unknown => JSON.parse(text)),
  );

  if (!readResult.ok) {
    if (isNodeError(readResult.error, "ENOENT")) {
      return [];
    }
    throw new Error(`Failed to read ${path}`, { cause: readResult.error });
  }

  const entry = validateStore(readResult.value, path)[rootDir];
  if (entry === undefined) {
    return [];
  }

  const result = v.safeParse(favoritesSchema, entry);
  if (!result.success) {
    throw new Error(
      `Invalid favorites of ${rootDir} in ${path}: ${v.summarize(result.issues)}`,
    );
  }

  return expandGroups(result.output);
};

/**
 * Writes favorites of one project and keeps every other project untouched.
 * Creates the file and its directory if missing; drops the project's entry
 * when its list becomes empty.
 *
 * Synchronous on purpose: the file is tiny, and a blocking write means
 * toggles land on disk in order and nothing is left half-written when the
 * process exits right after a toggle. The write goes through a temp file and
 * a rename, so a crash never corrupts favorites of other projects.
 */
export const saveFavorites = (
  rootDir: string,
  favorites: readonly Favorite[],
): void => {
  const path = getFavoritesPath();
  const readResult = attempt((): unknown =>
    JSON.parse(readFileSync(path, "utf8")),
  );

  let store: Record<string, unknown> = {};
  if (readResult.ok) {
    store = validateStore(readResult.value, path);
  } else if (!isNodeError(readResult.error, "ENOENT")) {
    throw new Error(`Failed to read ${path}`, { cause: readResult.error });
  }

  const { [rootDir]: _previous, ...others } = store;
  const next =
    favorites.length > 0
      ? { ...others, [rootDir]: groupRefs(favorites) }
      : others;

  mkdirSync(dirname(path), { recursive: true });
  const tempPath = `${path}.${process.pid}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(next, null, 2)}\n`);
  renameSync(tempPath, path);
};
