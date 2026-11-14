import { dirname } from "node:path";

const getParentOrNull = (directory: string) => {
  const parent = dirname(directory);

  if (parent === directory) {
    return null;
  }

  return parent;
};

export default getParentOrNull;
