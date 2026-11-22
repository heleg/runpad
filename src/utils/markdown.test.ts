import { describe, expect, test } from "bun:test";

import stringWidth from "string-width";

import renderMarkdown, { type Line, wrapSpans } from "./markdown";

const text = (lines: Line[]) =>
  lines.map((line) => line.map((span) => span.text).join(""));

const render = (markdown: string, width = 40) =>
  text(renderMarkdown(markdown, width));

describe("renderMarkdown", () => {
  test("styles headings and inline text without the syntax", () => {
    const [heading, , paragraph] = renderMarkdown(
      "# Title\n\nSome **bold**, *italic*, ~~gone~~ and `code`.",
      80,
    );
    expect(heading).toEqual([{ text: "Title", bold: true, color: "cyan" }]);
    expect(paragraph).toEqual([
      { text: "Some " },
      { text: "bold", bold: true },
      { text: ", " },
      { text: "italic", italic: true },
      { text: ", " },
      { text: "gone", strikethrough: true },
      { text: " and " },
      { text: "code", color: "yellow" },
      { text: "." },
    ]);
  });

  test("nests styles", () => {
    const [line] = renderMarkdown("**bold *both***", 80);
    expect(line).toContainEqual({ text: "both", bold: true, italic: true });
  });

  test("keeps escaped syntax and decodes entities", () => {
    expect(render("\\*not italic\\* &amp; a &lt; b")).toEqual([
      "*not italic* & a < b",
    ]);
  });

  test("wraps paragraphs between words", () => {
    expect(render("one two three four five six", 10)).toEqual([
      "one two",
      "three four",
      "five six",
    ]);
  });

  test("joins soft line breaks, keeps hard ones", () => {
    expect(render("one\ntwo\n3. three", 80)).toEqual(["one two 3. three"]);
    expect(render("one  \ntwo", 80)).toEqual(["one", "two"]);
    expect(render("1. **a.** x\n   y", 80)).toEqual(["1. a. x y"]);
  });

  test("shows the url of a link, but not twice for bare urls", () => {
    expect(render("[docs](https://vite.dev) and https://x.dev", 80)).toEqual([
      "docs (https://vite.dev) and https://x.dev",
    ]);
  });

  test("renders lists with nested items and tasks", () => {
    expect(
      render("- one\n  - nested\n- [x] done\n\n1. first\n2. second"),
    ).toEqual([
      "• one",
      "  • nested",
      "• [x] done",
      "",
      "1. first",
      "2. second",
    ]);
  });

  test("indents wrapped list items", () => {
    expect(render("- one two three", 9)).toEqual(["• one two", "  three"]);
  });

  test("keeps code blocks as written, breaking only long lines", () => {
    expect(render("```sh\npnpm  run   dev\nabcdefghij\n```", 8)).toEqual([
      "  pnpm  ",
      "  run   ",
      "  dev",
      "  abcdef",
      "  ghij",
    ]);
  });

  test("renders blockquotes and rules", () => {
    expect(render("> quoted\n\n---", 8)).toEqual(["│ quoted", "", "────────"]);
  });

  test("aligns table columns", () => {
    expect(
      render("| Name | Size |\n| :--- | ---: |\n| a | 1 |\n| bbb | 22 |"),
    ).toEqual(["Name │ Size", "─────┼─────", "a    │    1", "bbb  │   22"]);
  });

  test("wraps cells of wide tables, ruling off rows", () => {
    const lines = render(
      "| Script | What it does |\n| - | - |\n| dev | Starts the dev server |\n| build | Builds |",
      21,
    );
    expect(lines.map((line) => line.trimEnd())).toEqual([
      "Script │ What it does",
      "───────┼─────────────",
      "dev    │ Starts the",
      "       │ dev server",
      "───────┼─────────────",
      "build  │ Builds",
    ]);
  });

  test("keeps every word of a cell", () => {
    const lines = render(
      "| a | b |\n| - | - |\n| x | one two three four five six |",
      16,
    );
    expect(lines.every((line) => stringWidth(line) <= 16)).toBe(true);
    expect(lines.join(" ").replace(/[│─┼\s]+/g, " ")).toContain(
      "one two three four five six",
    );
  });

  test("strips control characters from the source", () => {
    expect(render("a\u0007b\u001b[31mc")).toEqual(["abc"]);
  });

  test("shows unknown blocks as raw text", () => {
    expect(render("<div>hi</div>")).toEqual(["<div>hi</div>"]);
  });
});

describe("wrapSpans", () => {
  test("splits words longer than the width", () => {
    expect(text(wrapSpans([{ text: "abcdefghij" }], 4))).toEqual([
      "abcd",
      "efgh",
      "ij",
    ]);
  });

  test("measures wide characters", () => {
    expect(text(wrapSpans([{ text: "日本語です" }], 4))).toEqual([
      "日本",
      "語で",
      "す",
    ]);
  });

  test("keeps styles across a break", () => {
    expect(wrapSpans([{ text: "ab cd", bold: true }], 2)).toEqual([
      [{ text: "ab", bold: true }],
      [{ text: "cd", bold: true }],
    ]);
  });

  test("returns one empty line for empty text", () => {
    expect(wrapSpans([], 10)).toEqual([[]]);
  });
});
