# Runpad fixture projects

These are deliberately small fake projects, not dependencies of Runpad. No install is needed. Some manifests and lockfiles are intentionally invalid. Never run a recursive package install, formatter, or JSON validator over this directory.

For the Bun test inventory, its 341 TODO cases, coverage groups, and implementation status, see [tests/README.md](../README.md). This guide covers the 58 fixture projects and their manual preparation.

## Launch

From the repository root, prepare an isolated copy (this does not run tests):

```sh
bun tests/prepare-fixture.ts basic/npm
```

The command prints its temporary directory. Change into that directory (plus the `cwd` in `expected.json`), then launch the source using an absolute Bun path:

```sh
cd /tmp/runpad-fixture-XXXXXX/project
bun /absolute/path/to/runpad/src/index.ts
```

Bun and the selected package manager must already be installed for execution scenarios; do not install dependencies in fixtures. `node` is required by the demo scripts. Any remaining lockfiles are presence markers, not genuine lockfiles, and do not establish manager compatibility.

Always isolate no-package and no-root-manifest scenarios: inside this repository, upward discovery would find Runpad's own package.json. The preparer rejects temporary locations with a package.json ancestor. Permission changes, symlinks, ignored directories and empty PATH directories are made only in the temporary copy. For missing-manager, launch with `PATH="" /absolute/path/to/bun /absolute/path/to/runpad/src/index.ts`.

## Expectations

Each `expected.json` records independent launches. All cwd, workspace and package paths are relative to the fixture root. `workspace: null` means standalone mode; `manager: null` means failure before manager detection. `packages` maps package paths to displayed script names in insertion order, not package display order. The selected package is sorted first in workspace mode, then other packages by name. Commands are in each package.json. Empty script lists should display “No scripts found”; Enter should do nothing, and Esc should exit without execution (code 0).

Expectations are derived from source inspection, not a test run. They describe current behavior, including silent YAML fallback and skipped invalid workspace manifests, rather than an ideal future contract. For errors, `path` names the problematic file; `pathInMessage: false` documents that current parser/schema diagnostics do not reliably show it. Runtime-specific stack traces and exact parser wording are not fixed. Lock parsing failures belong to the manager and are not assigned invented exit codes here.

For permission cases use an ordinary POSIX user, never root. For `filesystem/unreadable-parent`, first enter `parent/child`, then run `chmod 000 ..`, then launch Runpad with an absolute Bun path. Restore with `chmod 700 ..` from that same shell afterward. Preparation defers this permission change so that entering the launch directory remains possible. After manual use, restore permissions in the disposable copy with `chmod -R u+rwX /tmp/runpad-fixture-XXXXXX` before removing it. No setup mutates the checked-in fixture.

## Catalog

- `basic/npm`
- `basic/empty-scripts`
- `basic/missing-scripts`
- `basic/empty-command`
- `basic/missing-name`
- `basic/no-dependencies`
- `basic/no-package` — Must be copied outside this repository and any package.json ancestor.
- `workspaces/npm`
- `workspaces/yarn`
- `workspaces/bun`
- `workspaces/pnpm`
- `workspaces/object`
- `workspaces/no-scripts`
- `workspaces/empty`
- `workspaces/unmatched`
- `workspaces/recursive-overlap` — Each package appears once; directories without manifests are omitted.
- `workspaces/excluded`
- `workspaces/independent`
- `workspaces/nested`
- `workspaces/duplicate-names`
- `workspaces/ignored-directories` — Preparation creates fake packages beneath node_modules and .git; neither should appear.
- `workspaces/no-root-manifest` — Run outside the repository: root launch cannot find a child package.json.
- `workspaces/yaml-without-packages` — Valid YAML but unsupported workspace shape: current code treats this as a standalone npm project.
- `invalid/json-truncated` — Current raw parser/schema error does not reliably include the manifest path; path is the offending file, not an asserted diagnostic.
- `invalid/json-trailing-comma` — Current raw parser/schema error does not reliably include the manifest path; path is the offending file, not an asserted diagnostic.
- `invalid/json-unclosed-quote` — Current raw parser/schema error does not reliably include the manifest path; path is the offending file, not an asserted diagnostic.
- `invalid/json-empty` — Current raw parser/schema error does not reliably include the manifest path; path is the offending file, not an asserted diagnostic.
- `invalid/json-null` — Current raw parser/schema error does not reliably include the manifest path; path is the offending file, not an asserted diagnostic.
- `invalid/json-array` — Current raw parser/schema error does not reliably include the manifest path; path is the offending file, not an asserted diagnostic.
- `invalid/json-string` — Current raw parser/schema error does not reliably include the manifest path; path is the offending file, not an asserted diagnostic.
- `invalid/scripts-null`
- `invalid/scripts-string`
- `invalid/scripts-array`
- `invalid/script-number`
- `invalid/script-object`
- `invalid/script-null`
- `invalid/name-type`
- `invalid/manager-type`
- `invalid/workspaces-type`
- `invalid/yaml-syntax` — Current behavior: silently ignores invalid YAML or schema, then uses JSON workspaces or standalone mode.
- `invalid/yaml-empty` — Current behavior: silently ignores invalid YAML or schema, then uses JSON workspaces or standalone mode.
- `invalid/yaml-packages-string` — Current behavior: silently ignores invalid YAML or schema, then uses JSON workspaces or standalone mode.
- `invalid/yaml-packages-numbers` — Current behavior: silently ignores invalid YAML or schema, then uses JSON workspaces or standalone mode.
- `invalid/yaml-json-fallback` — Malformed YAML is currently masked by valid JSON workspaces.
- `invalid/workspace-root` — Valid YAML selects workspace mode; malformed root manifest is silently omitted.
- `invalid/workspace-child` — Malformed child is silently omitted.
- `filesystem/deep`
- `filesystem/unicode-spaces`
- `filesystem/symlink` — Compare canonical cwd with project; preparation creates a relative symlink.
- `filesystem/unreadable-package-json` — POSIX only; run as a non-root user. Unreadable YAML is currently ignored.
- `filesystem/unreadable-pnpm-workspace-yaml` — POSIX only; run as a non-root user. Unreadable YAML is currently ignored.
- `filesystem/unreadable-parent` — POSIX only; run as a non-root user. Unreadable YAML is currently ignored.
- `filesystem/directory-package-json` — Linux/POSIX behavior: YAML read errors are ignored.
- `filesystem/directory-pnpm-workspace-yaml` — Linux/POSIX behavior: YAML read errors are ignored.
- `execution/interactive` — cwd-args prints package cwd and fixed argv; success exits 0; failure exits 7; input echoes a line; long-running waits for Ctrl+C (signal exit reporting may differ by manager). Runpad currently has no CLI argument forwarding.
- `execution/missing-manager` — Launch with an absolute Bun path and an empty PATH, then select dev. Preparation creates empty-path; no manager or script should start.
- `ui/many-packages` — Scroll both columns through 32 packages with 32 scripts each.
- `ui/long-commands` — Inspect truncation and Space preview. Esc closes preview; Esc again exits without execution.
