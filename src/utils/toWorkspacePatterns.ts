/**
 * Workspace patterns in the one form the rest of runpad works with.
 * Every pattern is normalized to match `path.relative` output: no leading
 * `./`, no repeated or trailing slashes.
 */
export interface WorkspacePatterns {
  include: string[];
  /** Exclusions, without the leading `!`. */
  exclude: string[];
}

// npm, yarn and pnpm accept `./packages/*` and `packages/*/`, but
// `minimatch("packages/a", "./packages/*")` is false.
const normalize = (pattern: string): string =>
  pattern
    .replace(/\/{2,}/g, "/")
    .replace(/^(\.\/)+/, "")
    .replace(/(.)\/+$/, "$1") || ".";

// `!packages/x` is an exclusion, `!(internal)/*` is an extglob.
const isExclusion = (pattern: string): boolean =>
  pattern.startsWith("!") && !pattern.startsWith("!(");

/** Converts patterns as written in a workspace config. */
const toWorkspacePatterns = (raw: readonly string[]): WorkspacePatterns => {
  const include: string[] = [];
  const exclude: string[] = [];

  for (const pattern of raw) {
    if (isExclusion(pattern)) {
      exclude.push(normalize(pattern.slice(1)));
    } else {
      include.push(normalize(pattern));
    }
  }

  return { include, exclude };
};

export default toWorkspacePatterns;
