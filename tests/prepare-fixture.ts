import {
  chmod,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface FixtureExpectation {
  setup?: {
    isolated?: boolean;
    symlink?: boolean;
    emptyPath?: boolean;
    ignoredDirectories?: boolean;
    unreadable?: string;
  };
}

// Materialize filesystem-only scenarios without modifying checked-in fixtures.
const fixtures = fileURLToPath(new URL("./fixtures/", import.meta.url));
const name = process.argv[2];
if (!name) {
  throw new Error("Usage: bun tests/prepare-fixture.ts <category/name>");
}
const source = resolve(fixtures, name);
const relativeSource = relative(fixtures, source);
if (relativeSource.startsWith("..") || isAbsolute(relativeSource)) {
  throw new Error("Fixture must be inside tests/fixtures");
}
const { setup = {} }: FixtureExpectation = JSON.parse(
  await readFile(join(source, "expected.json"), "utf8"),
);

// Even ordinary fixtures may walk ancestors while looking for a workspace.
const temporaryRoot = resolve(tmpdir());
for (let ancestor = temporaryRoot; ; ancestor = dirname(ancestor)) {
  for (const filename of ["package.json", "pnpm-workspace.yaml"]) {
    try {
      await lstat(join(ancestor, filename));
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        continue;
      }
      throw error;
    }
    throw new Error(
      `Temporary directory has a ${filename} ancestor: ${ancestor}. Set TMPDIR to an isolated location.`,
    );
  }
  if (dirname(ancestor) === ancestor) {
    break;
  }
}
if (
  setup.unreadable &&
  (process.platform === "win32" || process.getuid?.() === 0)
) {
  throw new Error("Permission fixtures require a non-root POSIX user");
}

const destination = join(
  await mkdtemp(join(temporaryRoot, "runpad-fixture-")),
  "project",
);
await cp(source, destination, { recursive: true });
if (setup.symlink) {
  await symlink("project", join(destination, "link"), "dir");
}
if (setup.emptyPath) {
  await mkdir(join(destination, "empty-path"));
}
if (setup.ignoredDirectories) {
  for (const directory of ["node_modules", ".git"]) {
    const target = join(destination, directory, "hidden-package");
    await mkdir(target, { recursive: true });
    await writeFile(
      join(target, "package.json"),
      JSON.stringify(
        {
          name: `ignored-${directory}`,
          private: true,
          scripts: { "must-not-appear": "node -e \"console.log('ignored')\"" },
        },
        null,
        2,
      ) + "\n",
    );
  }
}
if (setup.unreadable === "parent") {
  // Enter the child before removing ancestor traversal permission.
  console.error("After cd into parent/child, run: chmod 000 ..");
  console.error(
    "Then launch Runpad using an absolute Bun path. Restore with: chmod 700 ..",
  );
} else if (setup.unreadable) {
  await chmod(join(destination, setup.unreadable), 0o000);
}
console.log(destination);
