---
title: Configuration
description: Pin, hide, describe and guard scripts for the whole team.
---

Commit a config file to the workspace root (or the package directory, outside a
workspace) and everyone gets the same list. The config is optional: without it
RunPad lists every script as is.

## The config file

RunPad reads one of these files:

- `runpad.config.yaml`
- `runpad.config.yml`
- `runpad.config.json`

Keep only one. If RunPad finds two, it stops and says so, rather than silently
ignoring edits to the other.

Point your editor at the schema to get completion and checks:

```yaml title="runpad.config.yaml"
# yaml-language-server: $schema=https://unpkg.com/@heleg/runpad/schema.json
scripts:
  pinned:
    - package: apps/web
      scripts: [dev, build]
```

```json title="runpad.config.json"
{
  "$schema": "https://unpkg.com/@heleg/runpad/schema.json",
  "scripts": {
    "pinned": [{ "package": "apps/web", "scripts": ["dev", "build"] }]
  }
}
```

In VS Code, the YAML comment needs the
[YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml).

### Packages

Every entry names a package by its directory, relative to the config file:
`apps/web`, `packages/db`. The root package is `.`.

## Pinned

Scripts the team uses most, listed at the top of their package and in the
<span class="mark-label mark-yellow">★ Favorites</span> row.

```yaml
scripts:
  pinned:
    - package: apps/web
      scripts: [dev, build]
    - package: .
      scripts: [lint]
```

## Hidden

Scripts nobody runs by hand: lifecycle hooks, helpers called by other scripts.
They are left out of the list; <kbd>H</kbd> shows them, dimmed.

```yaml
scripts:
  hidden:
    - package: .
      scripts: [prepare, postinstall]
```

A hidden script is not pinned either. Your own favorites are always shown, even
if hidden.

## Descriptions

A short note on what a script does, shown above its command.

```yaml
scripts:
  descriptions:
    - package: apps/web
      script: dev
      description: Vite dev server on :5173
    - package: packages/db
      script: db:reset
      description: Drop, migrate and restore the latest snapshot
      detailsFile: docs/scripts/db-reset.md
```

- `description`: one line.
- `detailsFile`: a Markdown file, relative to the config file, shown in the
  script view (<kbd>Space</kbd>). Scripts with details are marked
  <span class="mark mark-cyan">ⓘ</span>.

Each entry needs at least one of the two. If a script is listed twice, the first
entry wins. A details file that can't be read shows the error in its place
instead of stopping RunPad.

## Confirmation

Scripts that are hard to undo, like wiping a database, can ask before they run.
They are marked <span class="mark mark-red">⚠&#xFE0E;</span>.

```yaml
scripts:
  confirm:
    - package: packages/db
      scripts: [db:reset, db:clear]
```

This guards against a slip in RunPad only: typing `pnpm db:reset` in a terminal
asks nothing. Scripts that destroy data should check where they point
themselves.

## Script view

```yaml
viewer:
  detailsWidth: 100
```

`detailsWidth` wraps the details text at this many columns and centers it, so
long lines stay readable in a wide terminal. At least 40. Without it the text
takes the full width.

## Sharing entries with YAML

Root scripts often proxy package scripts, so the same description shows up
twice. YAML anchors and merge keys keep one copy:

```yaml
scripts:
  descriptions:
    - &db-reset
      package: packages/db
      script: db:reset
      description: Drop, migrate and restore the latest snapshot
      detailsFile: docs/scripts/db-reset.md
    - <<: *db-reset
      package: .
```
