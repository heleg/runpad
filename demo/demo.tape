# The demo GIF in the README and on the website. Re-record from the repo
# root after `bun run build`:
#
#   vhs demo/demo.tape
#
# `demo/acme` is a small pnpm monorepo made for this recording, and
# `demo/bin/vite` stands in for Vite, so nothing needs installing.

Output demo.gif

Set Shell bash
Set FontSize 20
Set Width 1200
Set Height 560
Set Padding 24
Set WindowBar Colorful
Set TypingSpeed 90ms
Set Framerate 24
# The website's dark theme: sky-tinted background, light green accent.
Set Theme { "name": "RunPad", "background": "#082030", "foreground": "#c1ced7", "cursor": "#86efac", "selection": "#1e4a66", "black": "#0b2a3d", "red": "#f87171", "green": "#4ade80", "yellow": "#facc15", "blue": "#60a5fa", "magenta": "#e879f9", "cyan": "#22d3ee", "white": "#c1ced7", "brightBlack": "#4f7a94", "brightRed": "#fca5a5", "brightGreen": "#86efac", "brightYellow": "#fde047", "brightBlue": "#93c5fd", "brightMagenta": "#f0abfc", "brightCyan": "#67e8f9", "brightWhite": "#ffffff" }

# Fresh favorites and history, so RunPad starts as on a first run; `rp`
# is the build from this repo.
Hide
Type "export PATH=$PWD/demo/bin:$PATH XDG_STATE_HOME=$(mktemp -d) XDG_CONFIG_HOME=$(mktemp -d)"
Enter
Type "export PS1='\[\e[38;2;134;239;172m\]~/\W\[\e[0m\] \$ '"
Enter
Type "export RUNPAD=$PWD/dist/index.mjs && alias rp='node $RUNPAD'"
Enter
Type "cd demo && clear"
Enter
Show

Sleep 500ms
Type "cd acme"
Sleep 300ms
Enter
Sleep 600ms
Type "rp"
Sleep 400ms
Enter
Sleep 1.5s

# Walk down to the web app, then into its scripts.
Down@450ms 4
Sleep 700ms
Right
Sleep 2s

Enter
Sleep 3.5s
