# RunPad

Terminal UI for browsing and running `package.json` scripts. Works in single
packages and npm, Yarn, pnpm and Bun workspaces.

![RunPad demo](./demo.gif)

## Why

Once a monorepo grows past a handful of packages, scripts get out of hand.
Dozens of `package.json` files, each with its own `dev`, `build`, `test:e2e`,
`db:migrate`... and you end up opening files just to remember what a script is
called, or typing `pnpm --filter some-long-name run something` from memory.

RunPad puts every script from every package in one list. Pick one, hit Enter,
done. Pin the ones your team actually uses, hide the noise, keep your own
favorites on top.

## Install

```bash
npm install -g @heleg/runpad # install globally
# or
mise use npm:@heleg/runpad # per project
```

Requires Node.js >= 22.18.0.

## Usage

Run `rp` anywhere inside a project (`runpad` is the same command with a longer
name).

## Configuration

Optional `runpad.config.json` in the workspace root (or package directory),
shared with the team. `package` is the package path relative to that root, `"."`
is the root package itself.

```json
{
  "$schema": "https://unpkg.com/@heleg/runpad/schema.json",
  "scripts": {
    "pinned": [{ "package": "apps/web", "scripts": ["dev", "build"] }],
    "hidden": [{ "package": ".", "scripts": ["prepare"] }]
  }
}
```

## Favorites

Press <kbd>F</kbd> in RunPad to add a favorite. Favorites are personal and live
outside the project, so there is nothing to commit or ignore.
