import { glob, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { render } from "ink";
import { createElement } from "react";
import * as v from "valibot";
import { attempt, toResult } from "withstand";

import Workspace, { type WorkspacePackage } from "./components/Workspace";
import getWorkspacePatterns from "./getWorkspacePatterns";
import isPartOfWorkspace from "./isPartOfWorkspace";
import packageJsonSchema from "./utils/packageJsonSchema";
import runScript from "./utils/runScript";

const readPackage = async (packageJsonPath: string) => {
  const file = await toResult(readFile(packageJsonPath, "utf8"));
  if (!file.ok) {
    return null;
  }

  const parsed = attempt(() => JSON.parse(file.value));
  if (!parsed.ok) {
    return null;
  }

  const result = v.safeParse(packageJsonSchema, parsed.value);
  return result.success ? result.output : null;
};

const runWorkspace = async (workspaceRoot: string, packageJsonPath: string) => {
  const root = resolve(workspaceRoot);
  const patterns = (await getWorkspacePatterns(root)) ?? [];
  const directories = new Set([root]);
  const includedPatterns = patterns.filter(
    (pattern) => !pattern.startsWith("!"),
  );

  if (includedPatterns.length > 0) {
    for await (const path of glob(includedPatterns, {
      cwd: root,
      exclude: [
        "**/node_modules",
        "**/node_modules/**",
        "**/.git",
        "**/.git/**",
      ],
    })) {
      const directory = resolve(root, path);
      if (isPartOfWorkspace({ patterns, root, cwd: directory })) {
        directories.add(directory);
      }
    }
  }

  const rootPackage = await readPackage(join(root, "package.json"));
  const packages: WorkspacePackage[] = [];

  for (const directory of directories) {
    const path = join(directory, "package.json");
    const packageJson =
      directory === root ? rootPackage : await readPackage(path);
    if (!packageJson) {
      continue;
    }

    packages.push({
      name: packageJson.name ?? (relative(root, directory) || "."),
      packageJsonPath: path,
      isRoot: directory === root,
      scripts: packageJson.scripts ?? {},
    });
  }

  const currentPath = resolve(packageJsonPath);
  packages.sort((a, b) => {
    const currentOrder =
      Number(b.packageJsonPath === currentPath) -
      Number(a.packageJsonPath === currentPath);
    return currentOrder || a.name.localeCompare(b.name);
  });

  let selection:
    | { workspacePackage: WorkspacePackage; script: string }
    | undefined;

  const { waitUntilExit } = render(
    createElement(Workspace, {
      packages,
      onSelect: (workspacePackage, script) => {
        selection = { workspacePackage, script };
      },
    }),
    { alternateScreen: true },
  );

  await waitUntilExit();
  if (!selection) {
    return;
  }

  await runScript({
    packageJsonPath: selection.workspacePackage.packageJsonPath,
    script: selection.script,
  });
};

export default runWorkspace;
