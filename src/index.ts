import { dirname } from "node:path";

import findWorkspaceRoot from "./findWorkspaceRoot";
import runPackage from "./runPackage";
import runWorkspace from "./runWorkspace";
import findUp from "./utils/findUp";

const cwd = process.cwd();
const packageJsonPath = await findUp(cwd, "package.json");

if (!packageJsonPath) {
  throw new Error("No package.json found");
}

const workspaceRoot = await findWorkspaceRoot(dirname(packageJsonPath));

if (workspaceRoot) {
  await runWorkspace(workspaceRoot, packageJsonPath);
} else {
  await runPackage(packageJsonPath);
}
