import { constants } from "node:os";
import { dirname } from "node:path";

import { execa } from "execa";
import { detectPackageManager } from "nypm";

const runScript = async ({
  script,
  packageJsonPath,
}: {
  packageJsonPath: string;
  script: string;
}) => {
  const manager = await detectPackageManager(packageJsonPath);

  if (!manager) {
    return process.exit(1);
  }

  const runResult = await execa(manager.command, ["run", script], {
    cwd: dirname(packageJsonPath),
    stdio: "inherit",
    reject: false,
  });

  if (runResult.failed) {
    console.error(runResult.shortMessage);
  }

  process.exitCode =
    runResult.exitCode ??
    (runResult.signal ? 128 + constants.signals[runResult.signal] : 1);
};

export default runScript;
