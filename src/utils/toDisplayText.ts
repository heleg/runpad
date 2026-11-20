import { stripVTControlCharacters } from "node:util";

// C0 controls except "\n", DEL and C1 controls. Left after
// stripVTControlCharacters: bell, backspace, lone ESC and the like.
// oxlint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g;

/**
 * Makes text from package.json safe to print in the terminal. A foreign
 * package.json could otherwise clear the screen, set the window title, or
 * hide part of a command behind "\r". Only for display: script names are
 * still run as written.
 */
const toDisplayText = (text: string): string =>
  stripVTControlCharacters(text)
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "  ")
    .replace(CONTROL_CHARACTERS, "");

export default toDisplayText;
