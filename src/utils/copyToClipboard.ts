import { spawnSync } from "node:child_process";

/** Clipboard commands to try, for the current platform and session. */
const clipboardTools = (): string[][] => {
  if (process.platform === "darwin") {
    return [["pbcopy"]];
  }
  if (process.platform === "win32") {
    return [["clip"]];
  }
  const tools: string[][] = [];
  if (process.env.WAYLAND_DISPLAY) {
    tools.push(["wl-copy"]);
  }
  if (process.env.DISPLAY) {
    tools.push(
      ["xclip", "-selection", "clipboard"],
      ["xsel", "--clipboard", "--input"],
    );
  }
  if (process.env.WSL_DISTRO_NAME) {
    tools.push(["clip.exe"]);
  }
  return tools;
};

/**
 * Puts `text` on the clipboard. Tries the system clipboard tools first;
 * without them (e.g. over SSH) asks the terminal to do it with OSC 52,
 * which many terminals support, though there is no way to know whether
 * this one did.
 */
const copyToClipboard = (text: string): "copied" | "requested" | "failed" => {
  for (const [command = "", ...args] of clipboardTools()) {
    const result = spawnSync(command, args, {
      input: text,
      stdio: ["pipe", "ignore", "ignore"],
      timeout: 2000,
    });
    if (!result.error && result.status === 0) {
      return "copied";
    }
  }
  if (!process.stdout.isTTY) {
    return "failed";
  }
  const encoded = Buffer.from(text).toString("base64");
  process.stdout.write(`\u001b]52;c;${encoded}\u0007`);
  return "requested";
};

export default copyToClipboard;
