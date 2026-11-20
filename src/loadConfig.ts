import { readFile } from "node:fs/promises";
import { join } from "node:path";

import * as v from "valibot";
import { toResult } from "withstand";

import { loadFavorites } from "./favoritesStore";
import {
  expandGroups,
  plainObject,
  type ScriptRef,
  scriptGroupSchema,
} from "./scriptRef";
import isNodeError from "./utils/isNodeError";

export type { Favorite, ScriptRef } from "./scriptRef";

export const configName = "runpad.config.json";

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
  };
}

/**
 * Reads one config file and validates it with its own schema.
 * Returns `undefined` if the file is missing.
 */
const readConfigFile = async <
  S extends v.GenericSchema<unknown, Record<string, unknown>>,
>(
  rootDir: string,
  fileName: string,
  schema: S,
): Promise<v.InferOutput<S> | undefined> => {
  const configPath = join(rootDir, fileName);
  const configJsonResult = await toResult(
    readFile(configPath, "utf8").then((text): unknown => JSON.parse(text)),
  );

  if (!configJsonResult.ok) {
    if (isNodeError(configJsonResult.error, "ENOENT")) {
      return undefined;
    }
    throw new Error(`Failed to read ${configPath}`, {
      cause: configJsonResult.error,
    });
  }

  const result = v.safeParse(schema, configJsonResult.value);
  if (!result.success) {
    throw new Error(`Invalid ${fileName}: ${v.summarize(result.issues)}`);
  }

  return result.output;
};

/**
 * Loads team settings from `runpad.config.json` and personal favorites from
 * the user's config directory (see `getFavoritesPath`).
 */
const loadConfig = async (rootDir: string): Promise<Config> => {
  const shared =
    (await readConfigFile(rootDir, configName, sharedSchema)) ??
    v.parse(sharedSchema, {});

  return {
    scripts: {
      hidden: expandGroups(shared.scripts.hidden),
      pinned: expandGroups(shared.scripts.pinned),
      favorites: await loadFavorites(rootDir),
    },
  };
};

export default loadConfig;
