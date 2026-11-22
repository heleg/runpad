# Backlog

Ordered by priority: first the checks for what already exists, then features.
Each item says why it matters, what to build, how, what is still open, and when
it counts as done.

## Key-press tests for the UI

### Why

Most of the UI is tested by its logic (`orderScripts`, `runCommand`, the history
store, the Markdown renderer) and by `renderToString` snapshots. Nothing presses
keys. So the flows that matter most are not checked at all:

- that <kbd>Enter</kbd> on a script from `scripts.confirm` asks first, that only
  <kbd>Y</kbd> runs it, and that any other key, a second <kbd>Enter</kbd>
  included, goes back;
- that <kbd>C</kbd> copies the right command and exits;
- that <kbd>?</kbd> opens the help and any key closes it;
- that RunPad starts on the last run script, in its package, with the scripts
  column active.

A slip in any of these passes every check today. The confirmation one is the
worst: it exists to protect databases.

### What

Tests that render `Workspace` and `Package`, send key presses and check what
happened: what is on screen, and what RunPad was asked to run or copy.

### How

- Render with `ink-testing-library` (`render`, `stdin.write`, `lastFrame`).
  First check that it supports Ink 8. If not, render with Ink's own `render`
  into a fake `stdout` and `stdin`, which is what the library does anyway.
- Keys are escape sequences: `\r` for Enter, `\u001b[B` for Down, `\u001b` for
  Esc, plain letters for the rest.
- `onSelect` and `onCopy` are props already: pass spies and check what they got.
  The clipboard and the actual run are outside the components, nothing to stub
  there.
- The config comes from `setConfig`: set it per test (confirm list, last run,
  descriptions), like the snapshots in this session did.
- Scenarios:
  - Enter runs a plain script;
  - Enter on a confirm script shows "Run …?", `y` calls `onSelect`, `n`, Esc and
    Enter go back without it;
  - the same from the script view (Space, then Enter);
  - `c` calls `onCopy` with the selected package and script;
  - `?` shows Keys and Marks, any key returns to the list;
  - with `lastRun` set, the first frame has the cursor on that script and its
    package selected; with a hidden or removed last run, the usual start;
  - Space on a script with details: Command pinned, ↓ scrolls the details.

### Open

- Whether `ink-testing-library` works with Ink 8 and React 19.
- Frames include colors; compare plain text (strip ANSI) unless a color is the
  point of the test.

### Done when

The scenarios above run in `bun test`, and breaking any of them (for example,
making Enter skip the confirmation) fails a test.

## Build the website in CI

### Why

The website is built only by its deploy workflow, on push to `master`. CI on
pull requests checks the CLI, not the site. When a dependency breaks the build,
it shows up only after merge, as a failed deploy.

This already happened once: Starlight's `Tabs` pulled in its native Markdown
parser `satteri`, whose binary was not found under Bun's isolated install
(`Cannot find module '@bruits/satteri-linux-x64-gnu'`). The fix is the
`publicHoistPattern` in `bunfig.toml`; a dependency update could break it again.

### What

A website build step in `ci.yml`, so pull requests and the release workflow
(which reuses `ci.yml`) fail on a broken site.

### How

- After the tests in `ci.yml`: `bun run website:build`, with
  `ASTRO_TELEMETRY_DISABLED=1`.
- `bun ci` already installs the website workspace, so no extra install.
- Optional: a link check on the built site (internal links must resolve under
  `/runpad/`), like the one-off script used when the base path was set up.

### Open

- The build adds time to every CI run. If it gets slow, run it only when
  `website/**`, `bun.lock` or `bunfig.toml` change.

### Done when

A pull request that breaks the site build fails CI.

## Put the command into the shell prompt

### Why

<kbd>C</kbd> copies the command, but the next step is almost always pasting it
and adding arguments: `pnpm --filter @shop/db run db:seed before-raid`. With
shell integration, RunPad exits and leaves the command in the prompt, cursor at
the end: type the argument, press Enter. No paste, no clipboard tools.

A second gain: commands run through the shell land in its history. Today a
script started from RunPad is not in history, so <kbd>↑</kbd> after `rp` finds
nothing.

### What

- `rp init zsh|bash|fish` prints a shell function `rp`, added once to the rc
  file:

  ```bash
  eval "$(rp init zsh)"
  ```

- Started through this function, <kbd>C</kbd> puts the command into the prompt.
  Started directly, it copies to the clipboard as now.

### How

- RunPad can't touch the prompt of the shell that started it: it is a child
  process, and the edit buffer belongs to the shell. So the function does it: it
  runs RunPad with an environment variable pointing at a temp file
  (`RUNPAD_OUTPUT`), RunPad writes the chosen command there and exits, and the
  function reads the file and fills the prompt.
- Per shell:
  - zsh: `print -z "$cmd"` puts the text into the next prompt;
  - fish: `commandline -r "$cmd"`;
  - bash can't fill the prompt after a program exits. Put the command into
    history (`history -s "$cmd"`), so <kbd>↑</kbd> brings it back. A `bind -x`
    key binding could fill the prompt, but only if RunPad is started by that
    key, not by typing `rp`;
  - PowerShell: `[Microsoft.PowerShell.PSConsoleReadLine]::Insert($cmd)`.
- Not `TIOCSTI` (pushing characters into the terminal input): Linux disables it
  by default since 6.2, OpenBSD removed it, and Node can't call it without a
  native module.
- The temp file is created by the function (`mktemp`) and removed after reading.

### Open

- Whether <kbd>Enter</kbd> should also go through the shell when integrated, for
  history. Then RunPad never runs scripts itself in that mode: it hands the
  command back and the shell runs it.
- Docs page: Shell integration, with the line for each rc file.

### Done when

In zsh and fish, `C` leaves the command in the prompt; in bash it is one
<kbd>↑</kbd> away; without the function, `C` copies as before.

## Search in the list

### Why

RunPad promises every script of every package in one list. In a big monorepo
that list is long: dozens of packages, each with its own `dev`, `build`,
`test:e2e`. Walking it with arrows is the slowest part of using RunPad, and the
one most likely to make someone type `pnpm --filter …` by hand again.

### What

Typing filters by package and script name, fuzzy, like fzf: `webdev` finds
`@acme/web › dev`, `dbseed` finds `@acme/db › db:seed`. Matches from all
packages come in one list, `package › script`, like the Favorites row.

### How

- Trigger: <kbd>/</kbd>. Plain letters are taken (<kbd>C</kbd>, <kbd>F</kbd>,
  <kbd>H</kbd>, <kbd>Q</kbd>), and starting a search on any other letter would
  make those few keys surprising.
- While searching:
  - a search line above the lists shows the query;
  - the results replace both columns with one list of `package › script`, best
    match first;
  - <kbd>↑</kbd> <kbd>↓</kbd> move, <kbd>Enter</kbd> runs (with confirmation
    where configured);
  - letters, space included, go into the query, so <kbd>C</kbd>, <kbd>F</kbd>
    and <kbd>Space</kbd> don't work while searching. Open question below;
  - <kbd>Esc</kbd> clears the query and returns to the lists; a second
    <kbd>Esc</kbd> exits as usual.
- Matching: subsequence match over `package script`, scored by consecutive
  letters and word starts (after `/`, `:`, `-`, `@`). Either a small own scorer
  (tens of lines) or a tiny dependency such as `fuzzysort`; prefer own code, as
  with the Markdown renderer.
- Highlight matched letters in the results.
- Hidden scripts are searched only while hidden are shown (<kbd>H</kbd>).

### Open

- How to copy or view a result while searching, when letters and Space go into
  the query: a modifier (<kbd>Ctrl</kbd>+<kbd>C</kbd> is taken by the terminal,
  so maybe <kbd>Ctrl</kbd>+<kbd>Y</kbd>), or <kbd>Tab</kbd> to leave the query
  and act on the selection with the usual keys.
- Whether the query should also match commands (`vite`, `drizzle-kit`) and
  descriptions. Useful, but noisier; maybe with lower weight.
- Whether favorites and pinned get a boost in the ranking.

### Done when

In the demo repo, `/`, `webdev`, <kbd>Enter</kbd> starts `@acme/web › dev`;
results update on every key; Esc returns to the lists unchanged.

## Generate the config reference from the schema

### Why

The Configuration page is written by hand. Every new field (as `confirm` and
`viewer.detailsWidth` were) has to be added there too, and sooner or later one
won't be. `schema.json` is generated from the valibot schema and already holds
every field with its type and description: it is the source of truth.

### What

A reference table on the website, built from `schema.json`: every field with its
path (`scripts.confirm[].scripts`), type, default, limits (`minimum: 40`) and
description.

### How

- An Astro component in `website/src/components/` that imports the root
  `schema.json`, walks `properties` (and `items` for arrays) and renders the
  table. It is rebuilt with the site, so it can't fall behind.
- Put it on a Reference page (`reference/config`), or at the bottom of
  Configuration.
- Keep the hand-written guide for examples and the why: the table answers "what
  fields are there", the guide "how to use them".
- Descriptions live in `v.description(...)` in `src/loadConfig.ts` and
  `src/scriptRef.ts`; improving the table means improving those, which also
  helps editor hints.

### Open

- Checks done with `v.check` (like "description or detailsFile") are not in the
  JSON Schema; they stay in the guide.

### Done when

Adding a field to the valibot schema and running `bun run schema` makes it
appear on the site with no other edit.

## Check Windows and macOS

### Why

Several parts are platform-specific and have only ever run on Linux:

- copying: `clip` on Windows, `clip.exe` in WSL, `pbcopy` on macOS;
- the history path: `%LOCALAPPDATA%` on Windows;
- paths in commands RunPad prints for <kbd>C</kbd> (`--dir ..\..` vs `../..`);
- `string-width` and the marks (`ⓘ`, `⚠`, `↻`) in Windows Terminal.

### What

Tests on all three systems in CI, and one manual pass on each.

### How

- A matrix in `ci.yml`: `ubuntu-latest`, `macos-latest`, `windows-latest`. At
  least typecheck and tests; lint and format once is enough.
- Fixtures and path tests may assume `/`; fix them to use `path.join` or
  normalize.
- `clip` reads input in the console code page, not UTF-8: package names with
  non-ASCII letters may come out garbled. Check, and if so, copy through
  PowerShell's `Set-Clipboard` instead.
- Manual pass: start `rp` in the demo repo, run a script, copy a command and
  paste it, open the script view.

### Open

- Whether Windows paths in copied commands should be quoted differently: the
  current quoting is POSIX shell. For PowerShell and cmd it may need its own.

### Done when

CI is green on all three, and copying plus running works by hand on each.

## Changelog

### Why

0.2.0 shipped many changes in one commit. GitHub's generated release notes are
built from commits and pull requests, so they come out thin, and nobody
upgrading can see what changed without reading the diff.

### What

`CHANGELOG.md` in Keep a Changelog style, filled in as features land, and its
section used as the release notes.

### How

- Sections per version: Added, Changed, Fixed, Removed. An "Unreleased" section
  on top collects changes until the next tag.
- Write the entry in the same change as the feature, like docs.
- Start it with 0.2.0, from the release notes drafted for that release.
- In `release.yml`, replace `generate_release_notes: true` with the section of
  the tagged version: extract it with a few lines of `awk` or a small script and
  pass it as `body_path` to `action-gh-release`.
- Optionally a Changelog page on the website that includes the file.

### Open

- Whether to check in CI that "Unreleased" is not empty when the version
  changes.

### Done when

The GitHub release for the next tag shows the changelog section, not generated
notes.

## Check the README on npm

### Why

The README shows the logo (`website/src/assets/logo-*.svg`, through `<picture>`)
and the demo GIF (`./demo.gif`) by relative paths. GitHub shows them. npm should
rewrite relative image paths to the GitHub repository through the `repository`
field in `package.json`, but that was not checked, and npm may drop `<picture>`
/ `<source>`.

### What

The README on npmjs.com shows the logo and the demo.

### How

- After the 0.2.0 publish, open the package page on npmjs.com.
- If images are broken, use absolute URLs:
  `https://raw.githubusercontent.com/heleg/runpad/master/demo.gif`, and the same
  for the logos.
- If `<picture>` is stripped, the `<img>` fallback (the light logo) still shows;
  that is acceptable.

### Done when

The npm page shows the logo and the GIF.
