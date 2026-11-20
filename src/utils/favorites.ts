import { relative, sep } from "node:path";

import type { Favorite, ScriptRef } from "../loadConfig";

/** Package key stored in config: posix path relative to root, "." for root. */
export const toPackageKey = (root: string, directory: string): string =>
  relative(root, directory).split(sep).join("/") || ".";

/** Stable id of a package + script pair. */
export const refId = (ref: ScriptRef): string =>
  `${ref.package}\0${ref.script}`;

const isSame = (a: Favorite, b: Favorite) => refId(a) === refId(b);

/** Removes the favorite if present, otherwise appends it. */
export const toggleFavorite = (
  favorites: readonly Favorite[],
  favorite: Favorite,
): Favorite[] =>
  favorites.some((item) => isSame(item, favorite))
    ? favorites.filter((item) => !isSame(item, favorite))
    : [...favorites, favorite];

/** Script names of the given package from a ref list, in config order. */
export const favoritesFor = (
  favorites: readonly ScriptRef[],
  packageKey: string,
): string[] =>
  favorites
    .filter((favorite) => favorite.package === packageKey)
    .map((favorite) => favorite.script);

/** Refs from `refs` that are not in `removed`, order kept. */
export const withoutRefs = (
  refs: readonly ScriptRef[],
  removed: readonly ScriptRef[],
): ScriptRef[] => {
  const removedIds = new Set(removed.map(refId));
  return refs.filter((ref) => !removedIds.has(refId(ref)));
};

export interface FavoriteRow<P> {
  favorite: ScriptRef;
  pkg: P;
  script: string;
}

/**
 * Resolves refs (pinned or favorites) against existing packages. Refs whose
 * package or script no longer exists are skipped, duplicates keep the
 * first occurrence.
 */
export const resolveFavorites = <
  P extends { key: string; scripts: Record<string, string> },
>(
  favorites: readonly ScriptRef[],
  packages: readonly P[],
): FavoriteRow<P>[] => {
  const seen = new Set<string>();
  return favorites.flatMap((favorite) => {
    const id = refId(favorite);
    const pkg = packages.find((item) => item.key === favorite.package);
    if (seen.has(id) || !pkg || !Object.hasOwn(pkg.scripts, favorite.script)) {
      return [];
    }
    seen.add(id);
    return [{ favorite, pkg, script: pkg.scripts[favorite.script] ?? "" }];
  });
};
