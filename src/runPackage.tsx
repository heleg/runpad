import { readFile } from "node:fs/promises";
import process from "node:process";

import { render } from "ink";
import * as v from "valibot";
import { attempt, toResult } from "withstand";

import Package from "./components/Package";
import packageJsonSchema from "./utils/packageJsonSchema";
import runScript from "./utils/runScript";

const runPackage = async (packageJsonPath: string) => {
  const fileResult = await toResult(readFile(packageJsonPath, "utf8"));
  if (!fileResult.ok) {
    throw fileResult.error;
  }

  const parsed = attempt(() => JSON.parse(fileResult.value));
  if (!parsed.ok) {
    throw parsed.error;
  }

  const packageJson = v.parse(packageJsonSchema, parsed.value);

  const scripts = packageJson.scripts ?? {};

  let selectedScript: string | undefined;

  const { waitUntilExit } = render(
    <Package
      scripts={scripts}
      onSelect={(script) => {
        selectedScript = script;
      }}
    />,
    { alternateScreen: true },
  );

  await waitUntilExit();

  if (!selectedScript) {
    return process.exit(0);
  }

  await runScript({
    packageJsonPath: packageJsonPath,
    script: selectedScript,
  });
};

export default runPackage;
