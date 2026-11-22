---
title: Using RunPad
description: Keys, list marks, the script view and copying commands.
---

Press <kbd>?</kbd> in RunPad to see this page in short.

## Keys

| Key                          | Action                                                                     |
| ---------------------------- | -------------------------------------------------------------------------- |
| <kbd>↑</kbd> <kbd>↓</kbd>    | Move through the list                                                      |
| <kbd>←</kbd> <kbd>→</kbd>    | Switch between packages and scripts (page up and down in a single package) |
| <kbd>Enter</kbd>             | Open a package, run a script                                               |
| <kbd>Space</kbd>             | Open a package, view the script                                            |
| <kbd>C</kbd>                 | Copy the command and exit                                                  |
| <kbd>F</kbd>                 | Add or remove a favorite                                                   |
| <kbd>H</kbd>                 | Show or hide hidden scripts                                                |
| <kbd>?</kbd>                 | Help                                                                       |
| <kbd>Esc</kbd>, <kbd>Q</kbd> | Exit                                                                       |

## Marks

<!-- Marks in the colors RunPad draws them; see .mark in custom.css. -->

| Mark                                               | Meaning                                                 |
| -------------------------------------------------- | ------------------------------------------------------- |
| <span class="mark mark-yellow">★</span>            | Your favorite                                           |
| <span class="mark mark-cyan">⚑</span>              | Pinned for the team; yellow if it is also your favorite |
| <span class="mark mark-cyan">ⓘ</span>              | Has details, <kbd>Space</kbd> to read them              |
| <span class="mark mark-red">⚠&#xFE0E;</span>       | Asks before running                                     |
| <span class="mark mark-dim">↻</span>               | Run last time                                           |
| <span class="mark-text mark-dim">name</span>       | Hidden by the config, shown with <kbd>H</kbd>           |
| <span class="mark-text mark-orange">[root]</span>  | The workspace root package                              |
| <span class="mark-text mark-cyan">[current]</span> | The package RunPad was started in                       |

## Favorites

<kbd>F</kbd> adds the selected script to your favorites. They are listed first,
and in a workspace they are gathered in the
<span class="mark-label mark-yellow">★ Favorites</span> row together with
scripts pinned for the team.

Favorites are personal and live outside the project, so there is nothing to
commit or ignore: `~/.config/runpad/favorites.json`, or
`$XDG_CONFIG_HOME/runpad/favorites.json` when set (`%APPDATA%` on Windows).

## Repeating the last script

RunPad remembers the last script you ran in each project and selects it on
start, marked with <span class="mark mark-dim">↻</span>. Running it again is
`rp` and <kbd>Enter</kbd>.

The history is kept in `~/.local/state/runpad/history.json`, or under
`$XDG_STATE_HOME` when set (`%LOCALAPPDATA%` on Windows). Only package and
script names are stored, not commands.

## The script view

<kbd>Space</kbd> on a script opens it in full: its description, the command, and
the [details file](../configuration/#descriptions) if it has one. The command
stays on top, the details scroll with <kbd>↑</kbd> <kbd>↓</kbd>.
<kbd>Enter</kbd> runs the script from here too.

## Copying a command

<kbd>C</kbd> copies the command that runs the selected script and exits, so you
can paste it and add arguments:

```bash
pnpm --filter @shop/db run db:seed before-raid
```

The command works from the directory you started RunPad in: a plain
`pnpm run <script>` for the package you are in, the package manager's workspace
form for other packages.

RunPad copies with `pbcopy`, `clip`, `wl-copy`, `xclip` or `xsel`, whichever is
available. Without them, for example over SSH, it asks the terminal to copy (OSC
52). Either way the command is printed after exit.

## Confirmation

Scripts listed in [`scripts.confirm`](../configuration/#confirmation) ask before
they run. Only <kbd>Y</kbd> runs the script, any other key goes back, so
pressing <kbd>Enter</kbd> twice by accident does nothing.
