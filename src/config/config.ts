import { attempt } from "withstand";

import { saveFavorites } from "../favoritesStore";
import { saveLastRun } from "../historyStore";
import type { Config, Favorite, ScriptRef } from "../loadConfig";
import printWarning from "../utils/printWarning";

let state: { config: Config; rootDir: string } | undefined;

const getState = () => {
  if (!state) {
    throw new Error("Config not initialized");
  }

  return state;
};

export function setConfig(value: Config, rootDir: string) {
  state = { config: value, rootDir };
}

export function getConfig(): Config {
  return getState().config;
}

/**
 * Updates favorites in memory and persists them synchronously.
 * Throws if the write fails; the in-memory update is kept either way.
 */
export function setFavorites(favorites: Favorite[]): void {
  const { config, rootDir } = getState();
  state = {
    rootDir,
    config: { ...config, scripts: { ...config.scripts, favorites } },
  };

  saveFavorites(rootDir, favorites);
}

/**
 * Remembers the script about to run, so the next start selects it. A
 * failed write only warns: it must not stop the script from running.
 */
export function rememberRun(ref: ScriptRef): void {
  const { rootDir } = getState();
  const result = attempt(() => saveLastRun(rootDir, ref));
  if (!result.ok) {
    printWarning(
      "Failed to remember the last run script",
      result.error instanceof Error
        ? result.error.message
        : String(result.error),
    );
  }
}
