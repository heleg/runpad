# Runpad tests

## Status

[runpad.test.ts](./runpad.test.ts) contains 341 `test.todo` declarations in 12
`describe` groups, using `bun:test`. Every case is a placeholder: there are no
test bodies, assertions, mocks, or automated fixture integrations yet. This is a
test plan, not verified coverage. Tests, linting, and type checks have not been
run as part of adding this inventory.

[fixtures/](./fixtures/README.md) contains 58 fake projects with per-project
`expected.json` files. The fixture catalog and the TODO inventory are not a
one-to-one mapping: some cases reuse a project, and others will need additional
fixtures, process controls, or a pseudo-terminal (PTY) when implemented.

## Commands

Run the inventory from the repository root with Bun:

```sh
bun run test
```

The `test` script in package.json runs `bun test`. To target only the inventory,
use `bun test ./tests/runpad.test.ts`. Until implementations are added, these
commands do not verify application behavior.

Prepare a disposable fixture copy for manual use:

```sh
bun tests/prepare-fixture.ts basic/npm
```

The helper prints the copied project path. Enter that directory, then the
relative `cwd` recorded in its `expected.json`, and launch Runpad with an
absolute source path:

```sh
cd /tmp/runpad-fixture-XXXXXX/project
bun /absolute/path/to/runpad/src/index.ts
```

Preparation only copies files and sets up the requested filesystem scenario; it
does not launch Runpad or execute tests. See the
[fixture guide](./fixtures/README.md) for permission cases, symlinks, missing
managers, isolation, and cleanup. Demo commands inside fixtures currently use
Node, so executing those scripts requires `node` in addition to the selected
package manager. The test runner is Bun.

## Planned coverage

| Group                                    | Scenarios                                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Project discovery and launch directory   | Nearest manifest, ancestor traversal, independent nested projects, Unicode paths, symlinks, access errors |
| Package manifest parsing and validation  | Missing and empty fields, malformed JSON, wrong types, unusual script names and commands                  |
| Workspace configuration parsing          | JSON arrays and objects, pnpm YAML, exclusions, invalid configuration and fallback                        |
| Workspace membership and root selection  | Glob matching, exclusions, nested roots, standalone non-members                                           |
| Workspace package discovery and ordering | Root and child packages, deduplication, ignored directories, missing manifests, ordering and large lists  |
| Script process invocation                | Manager argv, cwd, environment, interactive input, exit codes, spawn errors and interruption              |
| Standalone script list input             | Selection, navigation, empty lists, cancellation and preview                                              |
| Workspace interface input                | Column focus, package and script selection, empty workspaces and preview                                  |
| Scrolling and terminal layout            | Viewport boundaries, resize, long labels, Unicode and terminal restoration                                |
| Full command preview                     | Wrapping, multiline commands, scrolling, resize and closing                                               |
| Error diagnostics and lifecycle          | Error paths, exit status, cancellation, terminal handlers and child process cleanup                       |
| Fixture isolation and preparation        | Safe copying, ancestor checks, filesystem setup and independent temporary copies                          |

## Implementing the TODOs later

Replace individual TODO declarations with test bodies as work proceeds. Pure
parsing and matching cases can be tested directly; process cases need isolated
working directories and controlled executables; interactive terminal cases need
a PTY or an appropriate UI harness. Do not depend on whichever package managers
happen to be installed on a developer's machine for deterministic process tests.

Cases labeled “under current behavior” explicitly document existing quirks,
including ignored invalid YAML and skipped invalid workspace manifests. They are
not commitments to preserve those behaviors forever. Other TODOs describe
planned checks whose precise assertions still need to be established during
implementation.

Fixture expectations were derived from source inspection. Intentionally
malformed manifests and presence-only lockfile markers must stay intact; do not
install dependencies or recursively format the fixture tree. A successful
TODO-only run must not be reported as successful behavioral coverage.
