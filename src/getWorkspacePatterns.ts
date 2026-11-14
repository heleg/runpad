import { readFile } from "node:fs/promises";
import { join } from "node:path";

import * as v from "valibot";
import { attempt, toResult } from "withstand";
import { parse as parseYaml } from "yaml";

import packageJsonSchema from "./utils/packageJsonSchema";

const pnpmWorkspaceSchema = v.object({
  packages: v.array(v.string()),
});

const getWorkspacePatterns = async (cwd: string): Promise<string[] | null> => {
  const yamlPath = join(cwd, "pnpm-workspace.yaml");
  const yamlResult = await toResult(readFile(yamlPath, "utf8"));

  if (yamlResult.ok) {
    const parsed = attempt(() => parseYaml(yamlResult.value));

    if (parsed.ok) {
      const result = v.safeParse(pnpmWorkspaceSchema, parsed.value);
      if (result.success) {
        return result.output.packages;
      }
    }
  }

  const jsonPath = join(cwd, "package.json");
  const jsonResult = await toResult(readFile(jsonPath, "utf8"));

  if (!jsonResult.ok) {
    return null;
  }

  const parsed = attempt(() => JSON.parse(jsonResult.value));
  if (!parsed.ok) {
    return null;
  }

  const result = v.safeParse(packageJsonSchema, parsed.value);
  if (!result.success) {
    return null;
  }

  const { workspaces } = result.output;

  if (Array.isArray(workspaces)) {
    return workspaces;
  }

  return workspaces?.packages ?? null;
};

export default getWorkspacePatterns;
