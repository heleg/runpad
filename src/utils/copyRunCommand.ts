import { dirname, relative } from "node:path";
import { styleText } from "node:util";

import copyToClipboard from "./copyToClipboard";
import runCommand from "./runCommand";
import { detectManager } from "./runScript";

const MESSAGES = {
  copied: "Copied",
  requested: "Sent to the terminal clipboard",
  failed: "No clipboard found, copy it by hand",
} as const;

/**
 * Copies the command that runs `script` from the current directory and
 * prints it, so it is in sight even if the clipboard didn't take it.
 */
const copyRunCommand = async ({
  packageJsonPath,
  script,
  isCurrent,
  packageName,
}: {
  packageJsonPath: string;
  script: string;
  isCurrent: boolean;
  packageName?: string;
}) => {
  const directory = dirname(packageJsonPath);
  const manager = await detectManager(directory);
  if (manager === undefined) {
    return;
  }
  const command = runCommand({
    manager,
    script,
    isCurrent,
    packageName,
    directory: relative(process.cwd(), directory),
  });
  const result = copyToClipboard(command);
  console.log(
    styleText(result === "failed" ? "yellow" : "green", `${MESSAGES[result]}:`),
    command,
  );
};

export default copyRunCommand;
