import { access } from "node:fs/promises";
import { join } from "node:path";

import { toResult } from "withstand";

import getParentOrNull from "./getParentOrNull";
import isNodeError from "./isNodeError";

const findUp = async (
  cwd: string,
  filename: string,
): Promise<string | null> => {
  const filePath = join(cwd, filename);
  const result = await toResult(access(filePath));
  if (!result.ok) {
    if (!isNodeError(result.error, "ENOENT")) {
      throw result.error;
    }

    const parent = getParentOrNull(cwd);
    if (!parent) {
      return null;
    }
    return findUp(parent, filename);
  }
  return filePath;
};

export default findUp;
