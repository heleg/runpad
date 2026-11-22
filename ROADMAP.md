# Roadmap

## Put the command into the shell prompt

<kbd>C</kbd> copies the command, but the next step is almost always pasting it
and adding arguments (`db:seed before-raid`). With shell integration RunPad
exits and leaves the command in the prompt, cursor at the end.

- `rp init zsh|bash|fish` prints a shell function `rp`, added once to the rc
  file: `eval "$(rp init zsh)"`. It runs RunPad, reads the chosen command from a
  temp file and puts it into the prompt.
  - zsh: `print -z`. fish: `commandline -r`.
  - bash can't fill the prompt after a program exits: put the command into
    history (`history -s`), so <kbd>↑</kbd> brings it back.
- Started through the function, <kbd>C</kbd> fills the prompt. Started directly,
  it copies to the clipboard as now.
- Not `TIOCSTI`: Linux disables it by default since 6.2, OpenBSD removed it, and
  Node can't call it without a native module.
