import { relative, sep } from "node:path";

import { minimatch } from "minimatch";

import type { WorkspacePatterns } from "./utils/toWorkspacePatterns";

const isPartOfWorkspace = ({
  patterns,
  root,
  cwd,
}: {
  patterns: WorkspacePatterns;
  root: string;
  cwd: string;
}) => {
  const path = relative(root, cwd).split(sep).join("/");

  if (!path) {
    return false;
  }

  // Exclusions are already split out by toWorkspacePatterns. Without
  // `nonegate`, minimatch would read the extglob `!(tools)/*` as a negation.
  const matches = (pattern: string) =>
    minimatch(path, pattern, { nonegate: true });
  return patterns.include.some(matches) && !patterns.exclude.some(matches);
};

export default isPartOfWorkspace;
