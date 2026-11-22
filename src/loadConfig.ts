import { readFile } from "node:fs/promises";
import { join } from "node:path";

import * as v from "valibot";
import { attempt, toResult } from "withstand";
import { parse as parseYaml } from "yaml";

import { loadFavorites } from "./favoritesStore";
import { loadLastRun } from "./historyStore";
import {
  expandGroups,
  plainObject,
  type ScriptDescription,
  type ScriptDescriptionEntry,
  scriptDescriptionSchema,
  type ScriptRef,
  scriptGroupSchema,
} from "./scriptRef";
import isNodeError from "./utils/isNodeError";

export type { Favorite, ScriptDescription, ScriptRef } from "./scriptRef";

/** Config file names, any one of them. Two at once is an error. */
export const configNames = [
  "runpad.config.yaml",
  "runpad.config.yml",
  "runpad.config.json",
] as const;

const parseConfig = (fileName: string, text: string): unknown =>
  fileName.endsWith(".json")
    ? JSON.parse(text)
    : // Merge keys (`<<: *anchor`) let entries share fields. A file with only
      // comments parses to null and means an empty config.
      (parseYaml(text, { merge: true }) ?? {});

/** Team settings, committed to the repository. */
export const sharedSchema = plainObject({
  scripts: v.optional(
    plainObject({
      hidden: v.optional(
        v.pipe(
          v.array(scriptGroupSchema),
          v.description("Scripts left out of the lists."),
        ),
        [],
      ),
      pinned: v.optional(
        v.pipe(
          v.array(scriptGroupSchema),
          v.description("Scripts shown at the top for the whole team."),
        ),
        [],
      ),
      confirm: v.optional(
        v.pipe(
          v.array(scriptGroupSchema),
          v.description(
            "Scripts that ask for confirmation before running, e.g. ones that wipe a database.",
          ),
        ),
        [],
      ),
      descriptions: v.optional(
        v.pipe(
          v.array(scriptDescriptionSchema),
          v.description("Descriptions shown above the command of a script."),
        ),
        [],
      ),
    }),
    {},
  ),
  viewer: v.optional(
    plainObject({
      detailsWidth: v.optional(
        v.pipe(
          v.number(),
          v.integer(),
          v.minValue(40),
          v.description(
            "Width of the details text in the script view (Space), in columns, centered in a wider terminal. Full width if not set.",
          ),
        ),
      ),
    }),
    {},
  ),
});

export interface Config {
  scripts: {
    /** Removed from lists and from pinned, unless the user made it a favorite. */
    hidden: ScriptRef[];
    pinned: ScriptRef[];
    favorites: ScriptRef[];
    /** Ask before running: y runs, any other key cancels. */
    confirm: ScriptRef[];
    /** If a script is listed twice, the first description wins. */
    descriptions: ScriptDescription[];
  };
  /** The script run last in this project, selected on start. */
  lastRun?: ScriptRef;
  viewer: {
    /** Width of the details text in the script view; full width if not set. */
    detailsWidth?: number;
  };
}

/** Reads a config file. Returns `undefined` if it is missing. */
const readIfExists = async (
  rootDir: string,
  fileName: string,
): Promise<{ fileName: string; text: string } | undefined> => {
  const path = join(rootDir, fileName);
  const result = await toResult(readFile(path, "utf8"));
  if (result.ok) {
    return { fileName, text: result.value };
  }
  if (isNodeError(result.error, "ENOENT")) {
    return undefined;
  }
  throw new Error(`Failed to read ${path}`, { cause: result.error });
};

/**
 * Finds the config file, parses and validates it. Returns `undefined` if
 * there is none. Several config files are an error: silently picking one
 * would leave edits to the other with no effect.
 */
const readConfigFile = async <
  S extends v.GenericSchema<unknown, Record<string, unknown>>,
>(
  rootDir: string,
  schema: S,
): Promise<v.InferOutput<S> | undefined> => {
  const found = (
    await Promise.all(configNames.map((name) => readIfExists(rootDir, name)))
  ).filter((file) => file !== undefined);

  if (found.length > 1) {
    const names = found.map((file) => file.fileName).join(" and ");
    throw new Error(`Found ${names} in ${rootDir}, keep only one`);
  }
  const [file] = found;
  if (!file) {
    return undefined;
  }

  const parsed = attempt(() => parseConfig(file.fileName, file.text));
  if (!parsed.ok) {
    throw new Error(`Failed to read ${join(rootDir, file.fileName)}`, {
      cause: parsed.error,
    });
  }

  const result = v.safeParse(schema, parsed.value);
  if (!result.success) {
    throw new Error(`Invalid ${file.fileName}: ${v.summarize(result.issues)}`);
  }

  return result.output;
};

/**
 * Reads `detailsFile` of each entry into `details`. A file that cannot be
 * read does not stop RunPad: the error is shown in place of the details.
 */
const resolveDescriptions = (
  rootDir: string,
  entries: readonly ScriptDescriptionEntry[],
): Promise<ScriptDescription[]> =>
  Promise.all(
    entries.map(async (entry) => {
      const { detailsFile } = entry;
      if (detailsFile === undefined) {
        return entry;
      }
      const result = await toResult(
        readFile(join(rootDir, detailsFile), "utf8"),
      );
      const details = result.ok
        ? result.value
        : `_Cannot read \`${detailsFile}\`: ${formatReadError(result.error)}_`;
      return { ...entry, details };
    }),
  );

const formatReadError = (error: unknown): string =>
  error instanceof Error && "code" in error && typeof error.code === "string"
    ? error.code
    : String(error);

/**
 * Loads team settings from `runpad.config.{yaml,yml,json}` and personal favorites from
 * the user's config directory (see `getFavoritesPath`).
 */
const loadConfig = async (rootDir: string): Promise<Config> => {
  const shared =
    (await readConfigFile(rootDir, sharedSchema)) ?? v.parse(sharedSchema, {});

  return {
    scripts: {
      hidden: expandGroups(shared.scripts.hidden),
      pinned: expandGroups(shared.scripts.pinned),
      favorites: await loadFavorites(rootDir),
      confirm: expandGroups(shared.scripts.confirm),
      descriptions: await resolveDescriptions(
        rootDir,
        shared.scripts.descriptions,
      ),
    },
    lastRun: loadLastRun(rootDir),
    viewer: shared.viewer,
  };
};

export default loadConfig;
