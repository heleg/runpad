import { constants } from "node:os";
import { dirname } from "node:path";

import { execa } from "execa";
import { detectPackageManager } from "nypm";
import { toResult } from "withstand";

import printError from "./printError";
import printWarning from "./printWarning";

const FALLBACK_MANAGER = "npm";

/**
 * The package manager of the project at `cwd`: its command, e.g. `pnpm`.
 * Falls back to npm with a warning. Returns `undefined` after printing an
 * error if detection failed.
 */
export const detectManager = async (
  cwd: string,
): Promise<string | undefined> => {
  // `ignoreArgv`: without it nypm guesses from the path runpad itself was
  // installed at (e.g. ~/.bun/...), which has nothing to do with the project.
  const detectedResult = await toResult(
    detectPackageManager(cwd, { ignoreArgv: true }),
  );

  if (!detectedResult.ok) {
    printError(
      `Failed to detect package manager for ${cwd}`,
      detectedResult.error.message,
    );
    process.exitCode = 1;
    return undefined;
  }

  if (!detectedResult.value) {
    printWarning(
      `No package manager detected for ${cwd}, using ${FALLBACK_MANAGER}`,
      'Add a lockfile or a "packageManager" field to package.json to choose one.',
    );
  }
  return detectedResult.value?.command ?? FALLBACK_MANAGER;
};

const runScript = async ({
  script,
  packageJsonPath,
}: {
  packageJsonPath: string;
  script: string;
}) => {
  const cwd = dirname(packageJsonPath);
  const command = await detectManager(cwd);
  if (command === undefined) {
    return;
  }

  const runResult = await execa(command, ["run", script], {
    cwd,
    stdio: "inherit",
    reject: false,
  });

  if (runResult.failed) {
    printError(runResult.shortMessage ?? `Failed to run "${script}"`);
  }

  process.exitCode =
    runResult.exitCode ??
    (runResult.signal ? 128 + constants.signals[runResult.signal] : 1);
};

export default runScript;
