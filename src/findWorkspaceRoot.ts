import getWorkspacePatterns from "./getWorkspacePatterns";
import isPartOfWorkspace from "./isPartOfWorkspace";
import getParentOrNull from "./utils/getParentOrNull";

const searchRecursive = async (
  directory: string,
  packageRoot: string,
): Promise<string | null> => {
  const patterns = await getWorkspacePatterns(directory);

  if (
    patterns &&
    isPartOfWorkspace({
      patterns,
      root: directory,
      cwd: packageRoot,
    })
  ) {
    return directory;
  }

  const parent = getParentOrNull(directory);
  return parent ? searchRecursive(parent, packageRoot) : null;
};

const findWorkspaceRoot = async (
  packageRoot: string,
): Promise<string | null> => {
  const patterns = await getWorkspacePatterns(packageRoot);
  if (patterns) {
    return packageRoot;
  }

  const parent = getParentOrNull(packageRoot);
  return parent ? searchRecursive(parent, packageRoot) : null;
};

export default findWorkspaceRoot;
