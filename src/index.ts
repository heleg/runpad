import { dirname } from "node:path";

import { setConfig } from "./config/config";
import findWorkspaceRoot from "./findWorkspaceRoot";
import loadConfig from "./loadConfig";
import runPackage from "./runPackage";
import runWorkspace from "./runWorkspace";
import findUp from "./utils/findUp";
import formatError from "./utils/formatError";
import printError from "./utils/printError";

const main = async () => {
  const cwd = process.cwd();
  const packageJsonPath = await findUp(cwd, "package.json");

  if (!packageJsonPath) {
    printError(
      `No package.json found in ${cwd} or any parent directory`,
      "Run RunPad inside a JavaScript project.",
    );
    process.exitCode = 1;
    return;
  }

  const workspaceRoot = await findWorkspaceRoot(dirname(packageJsonPath));
  const root = workspaceRoot ?? dirname(packageJsonPath);

  setConfig(await loadConfig(root), root);

  if (workspaceRoot) {
    await runWorkspace(workspaceRoot, packageJsonPath);
  } else {
    await runPackage(packageJsonPath);
  }
};

try {
  await main();
} catch (error: unknown) {
  const { message, detail } = formatError(error);
  printError(message, detail);
  // The stack trace is noise for users, but needed to debug RunPad itself.
  if (process.env.RUNPAD_DEBUG && error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exitCode = 1;
}
