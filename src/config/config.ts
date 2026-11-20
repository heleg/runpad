import { saveFavorites } from "../favoritesStore";
import type { Config, Favorite } from "../loadConfig";

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
