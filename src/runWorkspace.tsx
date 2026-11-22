import { glob, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { render } from "ink";
import * as v from "valibot";
import { attempt, toResult } from "withstand";

import Workspace, { type WorkspacePackage } from "./components/Workspace";
import { rememberRun } from "./config/config";
import getWorkspacePatterns from "./getWorkspacePatterns";
import isPartOfWorkspace from "./isPartOfWorkspace";
import copyRunCommand from "./utils/copyRunCommand";
import { toPackageKey } from "./utils/favorites";
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
  const patterns = (await getWorkspacePatterns(root)) ?? {
    include: [],
    exclude: [],
  };
  const directories = new Set([root]);

  if (patterns.include.length > 0) {
    for await (const path of glob(patterns.include, {
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

  const currentPath = resolve(packageJsonPath);
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
      key: toPackageKey(root, directory),
      name: packageJson.name ?? (relative(root, directory) || "."),
      packageName: packageJson.name,
      description: packageJson.description,
      packageJsonPath: path,
      isRoot: directory === root,
      // In the root, `[root]` already says where you are.
      isCurrent: directory !== root && path === currentPath,
      scripts: packageJson.scripts ?? {},
    });
  }

  packages.sort((a, b) => {
    const currentOrder =
      Number(b.packageJsonPath === currentPath) -
      Number(a.packageJsonPath === currentPath);
    return currentOrder || a.name.localeCompare(b.name);
  });

  let selection:
    | {
        workspacePackage: WorkspacePackage;
        script: string;
        action: "run" | "copy";
      }
    | undefined;

  const { waitUntilExit } = render(
    <Workspace
      packages={packages}
      onSelect={(workspacePackage, script) => {
        selection = { workspacePackage, script, action: "run" };
      }}
      onCopy={(workspacePackage, script) => {
        selection = { workspacePackage, script, action: "copy" };
      }}
    />,
    { alternateScreen: true },
  );

  await waitUntilExit();
  if (!selection) {
    return;
  }

  const { workspacePackage, script } = selection;
  if (selection.action === "copy") {
    await copyRunCommand({
      packageJsonPath: workspacePackage.packageJsonPath,
      script,
      isCurrent: workspacePackage.packageJsonPath === currentPath,
      // The root has no workspace form in every manager; its directory works.
      packageName: workspacePackage.isRoot
        ? undefined
        : workspacePackage.packageName,
    });
    return;
  }

  rememberRun({ package: workspacePackage.key, script });
  await runScript({
    packageJsonPath: workspacePackage.packageJsonPath,
    script,
  });
};

export default runWorkspace;
