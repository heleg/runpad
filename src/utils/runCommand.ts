/** Quotes a shell word unless it is plain enough to go as is. */
export const shellQuote = (word: string): string =>
  /^[\w@%+=:,./-]+$/.test(word) ? word : `'${word.replaceAll("'", `'\\''`)}'`;

export interface RunTarget {
  /** Package manager command, e.g. `pnpm`. */
  manager: string;
  script: string;
  /**
   * Whether the script belongs to the package RunPad was started in (or a
   * single package): then plain `pnpm run <script>` works.
   */
  isCurrent: boolean;
  /**
   * `name` from package.json, for the manager's workspace form. Not set for
   * the workspace root or a package without a name.
   */
  packageName?: string;
  /** Package directory, relative to where RunPad was started. */
  directory: string;
}

/**
 * The command that runs `script` from the directory RunPad was started in,
 * as the user would type it, so arguments can be added at the end.
 */
const runCommand = ({
  manager,
  script,
  isCurrent,
  packageName,
  directory,
}: RunTarget): string => {
  const name = shellQuote(script);
  if (isCurrent) {
    return manager === "deno" ? `deno task ${name}` : `${manager} run ${name}`;
  }
  if (packageName !== undefined) {
    const pkg = shellQuote(packageName);
    switch (manager) {
      case "pnpm":
        return `pnpm --filter ${pkg} run ${name}`;
      case "yarn":
        return `yarn workspace ${pkg} run ${name}`;
      case "npm":
        return `npm run ${name} -w ${pkg}`;
      case "bun":
        return `bun run --filter ${pkg} ${name}`;
    }
  }
  // The root, a package without a name, or a manager without a workspace
  // form: point the manager at the directory.
  const dir = shellQuote(directory === "" ? "." : directory);
  switch (manager) {
    case "pnpm":
      return `pnpm --dir ${dir} run ${name}`;
    case "npm":
      return `npm --prefix ${dir} run ${name}`;
    case "deno":
      return `deno task --cwd ${dir} ${name}`;
    default:
      return `${manager} --cwd ${dir} run ${name}`;
  }
};

export default runCommand;
