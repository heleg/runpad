import { describe, expect, test } from "bun:test";

import runCommand, { shellQuote } from "./runCommand";

const base = { script: "db:seed", isCurrent: false, directory: "packages/db" };

describe("runCommand", () => {
  test("runs a script of the current package plainly", () => {
    expect(runCommand({ ...base, manager: "pnpm", isCurrent: true })).toBe(
      "pnpm run db:seed",
    );
    expect(runCommand({ ...base, manager: "deno", isCurrent: true })).toBe(
      "deno task db:seed",
    );
  });

  test("uses the workspace form for another named package", () => {
    const target = { ...base, packageName: "@shop/db" };
    expect(runCommand({ ...target, manager: "pnpm" })).toBe(
      "pnpm --filter @shop/db run db:seed",
    );
    expect(runCommand({ ...target, manager: "yarn" })).toBe(
      "yarn workspace @shop/db run db:seed",
    );
    expect(runCommand({ ...target, manager: "npm" })).toBe(
      "npm run db:seed -w @shop/db",
    );
    expect(runCommand({ ...target, manager: "bun" })).toBe(
      "bun run --filter @shop/db db:seed",
    );
  });

  test("points at the directory for the root or a package without a name", () => {
    const root = { ...base, directory: "../.." };
    expect(runCommand({ ...root, manager: "pnpm" })).toBe(
      "pnpm --dir ../.. run db:seed",
    );
    expect(runCommand({ ...root, manager: "npm" })).toBe(
      "npm --prefix ../.. run db:seed",
    );
    expect(runCommand({ ...root, manager: "yarn" })).toBe(
      "yarn --cwd ../.. run db:seed",
    );
    expect(runCommand({ ...root, manager: "deno" })).toBe(
      "deno task --cwd ../.. db:seed",
    );
  });

  test("quotes what the shell would split", () => {
    expect(
      runCommand({
        ...base,
        manager: "pnpm",
        script: "it's x",
        isCurrent: true,
      }),
    ).toBe(`pnpm run 'it'\\''s x'`);
  });
});

describe("shellQuote", () => {
  test("leaves plain words alone", () => {
    expect(shellQuote("@shop/web")).toBe("@shop/web");
  });

  test("quotes spaces and shell characters", () => {
    expect(shellQuote("a b")).toBe("'a b'");
    expect(shellQuote("$(rm)")).toBe("'$(rm)'");
  });
});
