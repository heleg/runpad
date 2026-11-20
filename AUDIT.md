# runpad audit — 2026-11-20

## 🟠 Medium

1. **[findUp.ts:14](src/utils/findUp.ts:14) accepts a directory named
   `package.json`.** `access` succeeds for it, then `readFile` fails with
   `EISDIR`. An `EACCES` error on any ancestor also stops the program. Both are
   now reported as a readable error instead of a stack trace, but the directory
   should be skipped. There is a fixture for this case
   (`tests/fixtures/filesystem/directory-package-json`), but no handling.

2. **Paging does not match the screen.** In
   [Package.tsx:57](src/components/Package.tsx:57) `pageSize = rows / 2`, while
   the visible rows are `rows - 6 - PREVIEW_HEIGHT`
   ([Package.tsx:71](src/components/Package.tsx:71)), so ←/→ jump to the wrong
   page. `→` at the end of the list does not move to the last item
   ([useKeyInput.ts:74](src/components/package/useKeyInput.ts:74)).

## 🟡 Potential and hygiene

3. **Ctrl+C while a script is running.** Both `rp` and the child process get
   SIGINT. The parent dies at once, without waiting for the child to finish a
   graceful shutdown, and the exit code is lost. The parent should ignore SIGINT
   while `execa` runs ([runScript.ts:44](src/utils/runScript.ts:44)).
