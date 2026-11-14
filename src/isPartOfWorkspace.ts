import { relative, sep } from "node:path";

import { minimatch } from "minimatch";

const isPartOfWorkspace = ({
  patterns,
  root,
  cwd,
}: {
  patterns: string[];
  root: string;
  cwd: string;
}) => {
  const path = relative(root, cwd).split(sep).join("/");

  if (!path) {
    return false;
  }

  const included = patterns.some(
    (pattern) => !pattern.startsWith("!") && minimatch(path, pattern),
  );

  const excluded = patterns.some(
    (pattern) => pattern.startsWith("!") && minimatch(path, pattern.slice(1)),
  );

  return included && !excluded;
};

export default isPartOfWorkspace;
