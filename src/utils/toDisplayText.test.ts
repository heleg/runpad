import { describe, expect, test } from "bun:test";

import toDisplayText from "./toDisplayText";

describe("toDisplayText", () => {
  test.each([
    ["plain text", "vite build", "vite build"],
    ["color codes", "a\u001B[31mred\u001B[0mb", "aredb"],
    ["clear screen", "x\u001B[2J\u001B[Hy", "xy"],
    ["OSC 8 link", "\u001B]8;;http://evil\u0007click\u001B]8;;\u0007", "click"],
    ["window title", "\u001B]0;pwned\u0007t", "t"],
    ["C1 CSI", "a\u009B31mb", "ab"],
    ["bell", "a\u0007b", "ab"],
    ["backspace", "abc\u0008\u0008XY", "abcXY"],
    ["lone ESC", "a\u001Bb", "ab"],
    ["DEL", "a\u007Fb", "ab"],
    ["NUL", "a\u0000b", "ab"],
    ["carriage return becomes a line break", "safe\revil", "safe\nevil"],
    ["CRLF becomes one line break", "a\r\nb", "a\nb"],
    ["keeps line breaks", "a\nb", "a\nb"],
    ["tab becomes spaces", "a\tb", "a  b"],
    ["keeps unicode", "проект ★ 日本", "проект ★ 日本"],
  ])("%s", (_, input, expected) => {
    expect(toDisplayText(input)).toBe(expected);
  });
});
