<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="website/src/assets/logo-dark.svg">
    <img src="website/src/assets/logo-light.svg" alt="" width="36">
  </picture>
  RunPad
</h1>

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
mise use npm:@heleg/runpad # per project, pinned in mise.toml for the whole team
# or
npm install -g @heleg/runpad # globally
```

Requires Node.js >= 22.18.0.

## Usage

Run `rp` anywhere inside a project (`runpad` is the same command with a longer
name).

## Configuration

Commit an optional `runpad.config.yaml` to the workspace root and the whole team
gets the same list: the scripts that matter on top, the noise gone, a short note
on what each one does.

```yaml
# yaml-language-server: $schema=https://unpkg.com/@heleg/runpad/schema.json
scripts:
  pinned:
    - package: apps/web
      scripts: [dev, build]
  hidden:
    - package: .
      scripts: [prepare]
  descriptions:
    - package: apps/web
      script: dev
      description: Vite dev server on :5173
```

Prefer JSON? `runpad.config.json` works too, with the same schema.

## Favorites

Press <kbd>F</kbd> in RunPad to add a favorite. Favorites are personal and live
outside the project, so there is nothing to commit or ignore.
