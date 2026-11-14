# Runpad playground

Twenty nested pnpm workspaces plus a root package, all with scripts. Applications,
services, shared libraries, tooling, and examples have internal `workspace:*`
dependencies. The existing pnpm version settings are preserved.

All operations use Node.js built-ins; no third-party dependencies are required.
Run scripts from their package directory or use pnpm workspace filtering.

```sh
pnpm --filter @runpad/web run dev
pnpm --filter @runpad/web run build:release
pnpm --filter @runpad/database run db:seed
pnpm run build
```

## Actual operations

- `build` copies source modules into `.mock-output/dist`, creates a runnable HTML
  preview, and writes a SHA-256 inventory. It does not transpile or bundle code.
- `dev`, `start`, `preview`, and `storybook` serve the built HTML and JavaScript
  over HTTP on localhost, with a JSON `/health` endpoint. The `storybook` script
  serves the same simple preview, not the Storybook framework. `dev` rebuilds
  when source files change. Dev ports are distinct; other servers select a free
  port unless `--port` is supplied. SIGINT/SIGTERM shuts them down.
- `test` uses Node's test runner to exercise slug normalization and integer price
  totals. Named test variants currently run this same suite, not separate E2E or
  integration infrastructure. `test:watch` reruns it on source changes.
- `check:syntax`, `check`, and `validate` invoke Node's JavaScript syntax checker.
  `lint` additionally rejects trailing whitespace. There is no TypeScript checker.
- `format` rewrites JSON with consistent indentation; `format:check` detects
  differences without writing files.
- `generate` and named generation variants write export/dependency metadata and
  source checksums to `generated.json`; they do not generate a real SDK or OpenAPI spec.
- Database commands persist a local JSON database: migrate sets schema version 2,
  seed writes ten users, reset clears users, and generate initializes the file.
- Queue/replay commands process local JSON jobs into SHA-256 results and empty
  the queue. A missing queue starts with five fixture jobs.
- `inventory` and `analyze` produce source sizes and SHA-256 reports.
- `bench` and `demo:slow` run actual SHA-256 loops and save measured timings.
- `demo:stderr` writes a diagnostic and an inventory. `demo:fail` deliberately fails.
- `clean` deletes only `.mock-output` in the current package.
- `info` prints the working directory; `runtime` prints the Node.js version.

Generated artifacts live under ignored `.mock-output` directories. No scripts
contact external services or a real database. Commands intentionally vary from
`node --version` to long release chains with quoted titles, flags, and `&&`.

Direct execution without pnpm:

```sh
cd apps/web
node ../../scripts/mock-task.mjs build --mode=production --title="Web preview"
node ../../scripts/mock-task.mjs preview --port=3100
```

## Runpad development

This directory contains the former standalone `runpad-test` project. It is a
manual playground; focused inputs for Runpad's automated tests live separately
in `tests/fixtures`.

From this directory, launch the local Runpad source:

```sh
bun ../src/index.ts
```

To explore discovery from a nested package:

```sh
cd apps/web
bun ../../../src/index.ts
```

Node.js and pnpm are required to execute the playground scripts. Run
`pnpm install` here if workspace links are needed. Generated artifacts stay in
ignored `.mock-output` directories. Runpad's oxlint and oxfmt configurations
exclude this playground.
