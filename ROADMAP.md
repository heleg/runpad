# Roadmap

## Select the last run script on start

Repeating the last script should be `rp` + <kbd>Enter</kbd>, while still showing
what is about to run.

- On start, select the script run last in this project (and its package in a
  workspace).
- Mark it with `↻` in the list.
- While it is selected, the preview box says `↻ Last run · Enter to repeat`
  above the command.
- Store the last run per project root in `$XDG_STATE_HOME/runpad/history.json`
  (`~/.local/state` by default, `%LOCALAPPDATA%` on Windows): package and script
  name only, not the command.
- If the script was renamed or removed, start as usual, without the mark.

## Copy the command

<kbd>C</kbd> copies the command of the selected script, in the list and in the
full command view.

- Copy what RunPad would run, runnable from the directory RunPad was started in.
  Not the raw script body: it often needs `node_modules/.bin` and the package
  directory.
  - Script of the package you are in (or a single package): plain
    `pnpm run test:e2e`.
  - Script of another workspace package: the manager's workspace form, which
    works from anywhere in the workspace:
    `pnpm --filter @shop/web run test:e2e`, `yarn workspace @shop/web test:e2e`,
    `npm run test:e2e -w @shop/web`.
- Write to the clipboard with OSC 52: no dependencies, works over SSH. Fall back
  to `pbcopy` / `clip.exe` / `wl-copy` / `xclip` when available.
- Confirm with `Copied` in the hint line for a moment.

## Mark the current package

In a workspace, mark the package RunPad was started in with `[current]`, the
same way the root package is marked `[root]`. It is already listed first, but
nothing says why.

- Show it in the packages column and in the full command view title.
- Started in the workspace root: show `[root]` only, the root is current anyway.
