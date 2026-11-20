export interface ScriptEntry {
  name: string;
  script: string;
  isPinned: boolean;
  isFavorite: boolean;
  /** Hidden by the shared config, listed only while hidden are shown. */
  isHidden: boolean;
}

/**
 * Orders scripts as: favorites (local config order, pinned or not), then
 * pinned that are not favorites (shared config order), then the rest in
 * package.json order. Names missing from `scripts` are ignored.
 *
 * Hidden scripts are left out, and are not pinned either. A favorite is
 * always shown: the user's own choice beats the shared config. With
 * `showHidden` nothing is left out, hidden rows are only flagged.
 */
const orderScripts = (
  scripts: Record<string, string>,
  favorites: readonly string[],
  pinned: readonly string[] = [],
  hidden: readonly string[] = [],
  showHidden = false,
): ScriptEntry[] => {
  const exists = (name: string) => Object.hasOwn(scripts, name);
  const favoriteSet = new Set(favorites.filter(exists));
  const hiddenSet = new Set(hidden.filter((name) => !favoriteSet.has(name)));
  const pinnedSet = new Set(
    pinned.filter(
      (name) => exists(name) && (showHidden || !hidden.includes(name)),
    ),
  );
  const isListed = (name: string) => showHidden || !hiddenSet.has(name);

  const names = [
    ...favoriteSet,
    ...[...pinnedSet].filter((name) => !favoriteSet.has(name)),
    ...Object.keys(scripts).filter(
      (name) =>
        !pinnedSet.has(name) && !favoriteSet.has(name) && isListed(name),
    ),
  ];

  return names.map((name) => ({
    name,
    script: scripts[name] ?? "",
    isPinned: pinnedSet.has(name),
    isFavorite: favoriteSet.has(name),
    isHidden: hiddenSet.has(name),
  }));
};

export default orderScripts;
