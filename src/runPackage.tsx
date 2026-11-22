import { readFile } from "node:fs/promises";

import { render } from "ink";
import * as v from "valibot";
import { attempt, toResult } from "withstand";

import Package from "./components/Package";
import { rememberRun } from "./config/config";
import copyRunCommand from "./utils/copyRunCommand";
import packageJsonSchema from "./utils/packageJsonSchema";
import runScript from "./utils/runScript";

const runPackage = async (packageJsonPath: string) => {
  const fileResult = await toResult(readFile(packageJsonPath, "utf8"));
  if (!fileResult.ok) {
    throw new Error(`Failed to read ${packageJsonPath}`, {
      cause: fileResult.error,
    });
  }

  const parsed = attempt((): unknown => JSON.parse(fileResult.value));
  if (!parsed.ok) {
    throw new Error(`Failed to read ${packageJsonPath}`, {
      cause: parsed.error,
    });
  }

  const result = v.safeParse(packageJsonSchema, parsed.value);
  if (!result.success) {
    throw new Error(
      `Invalid ${packageJsonPath}: ${v.summarize(result.issues)}`,
    );
  }
  const packageJson = result.output;

  const scripts = packageJson.scripts ?? {};

  let selectedScript: string | undefined;
  let isCopy = false;

  const { waitUntilExit } = render(
    <Package
      scripts={scripts}
      onSelect={(script) => {
        selectedScript = script;
      }}
      onCopy={(script) => {
        selectedScript = script;
        isCopy = true;
      }}
    />,
    { alternateScreen: true },
  );

  await waitUntilExit();

  if (!selectedScript) {
    return;
  }

  if (isCopy) {
    await copyRunCommand({
      packageJsonPath,
      script: selectedScript,
      isCurrent: true,
    });
    return;
  }

  // In single-package mode the config root is the package itself.
  rememberRun({ package: ".", script: selectedScript });
  await runScript({
    packageJsonPath: packageJsonPath,
    script: selectedScript,
  });
};

export default runPackage;
