import { Lexer, type Token, type Tokens } from "marked";
import stringWidth from "string-width";

import toDisplayText from "./toDisplayText";

/** A piece of text with one style, drawn as an Ink `<Text>`. */
export interface Span {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  dim?: boolean;
  color?: string;
}

/** One screen line. */
export type Line = Span[];

type Style = Omit<Span, "text">;

const HEADING_COLOR = "cyan";
const CODE_COLOR = "yellow";

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

const unescape = (text: string) =>
  text.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity] ?? "");

// --- Inline -----------------------------------------------------------------

const inline = (tokens: readonly Token[] = [], style: Style = {}): Span[] =>
  tokens.flatMap((token) => inlineToken(token, style));

const inlineToken = (token: Token, style: Style): Span[] => {
  switch (token.type) {
    case "text":
      return "tokens" in token && token.tokens
        ? inline(token.tokens, style)
        : // A newline inside a paragraph is a soft break: the text flows
          // on and wraps to the screen. Hard breaks come as `br` tokens.
          [
            {
              ...style,
              text: unescape(token.text).replace(/[ \t]*\n\s*/g, " "),
            },
          ];
    case "escape":
      return [{ ...style, text: token.text }];
    case "strong":
      return inline(token.tokens, { ...style, bold: true });
    case "em":
      return inline(token.tokens, { ...style, italic: true });
    case "del":
      return inline(token.tokens, { ...style, strikethrough: true });
    case "codespan":
      return [{ ...style, text: token.text, color: CODE_COLOR }];
    case "br":
      return [{ text: "\n" }];
    case "link": {
      const label = inline(token.tokens, { ...style, underline: true });
      const labelText = label.map((span) => span.text).join("");
      return labelText === token.href
        ? label
        : [...label, { text: ` (${token.href})`, dim: true }];
    }
    case "image":
      return [{ text: `[${token.text || "image"}]`, dim: true }];
    default:
      return [{ ...style, text: token.raw }];
  }
};

// --- Wrapping ---------------------------------------------------------------

const lineWidth = (line: Line) =>
  line.reduce((sum, span) => sum + stringWidth(span.text), 0);

/** Splits text into pieces no wider than `width`, by grapheme. */
const splitByWidth = (text: string, width: number): string[] => {
  const pieces: string[] = [];
  let piece = "";
  for (const { segment } of new Intl.Segmenter().segment(text)) {
    if (piece !== "" && stringWidth(piece + segment) > width) {
      pieces.push(piece);
      piece = "";
    }
    piece += segment;
  }
  return piece === "" ? pieces : [...pieces, piece];
};

const sameStyle = (a: Span, b: Span) =>
  a.bold === b.bold &&
  a.italic === b.italic &&
  a.strikethrough === b.strikethrough &&
  a.underline === b.underline &&
  a.dim === b.dim &&
  a.color === b.color;

/** Drops spaces at the end of a line, they would only push the width. */
const trimEnd = (line: Line): Line => {
  const result = [...line];
  while (result.length > 0) {
    const last = result.at(-1)!;
    const text = last.text.trimEnd();
    if (text !== "") {
      result[result.length - 1] = { ...last, text };
      break;
    }
    result.pop();
  }
  return result;
};

/**
 * Wraps styled text into lines no wider than `width`. `"\n"` starts a new
 * line. Prose breaks between words; with `hard`, text breaks anywhere, as a
 * terminal does, which suits code.
 */
export const wrapSpans = (
  spans: readonly Span[],
  width: number,
  hard = false,
): Line[] => {
  const max = Math.max(1, width);
  const lines: Line[] = [];
  let line: Line = [];
  let used = 0;
  const breakLine = () => {
    lines.push(hard ? line : trimEnd(line));
    line = [];
    used = 0;
  };
  const put = (span: Span, text: string) => {
    const last = line.at(-1);
    // Pieces of one span join back, so a line keeps one span per style.
    if (last && sameStyle(last, span)) {
      line[line.length - 1] = { ...last, text: last.text + text };
    } else {
      line.push({ ...span, text });
    }
    used += stringWidth(text);
  };

  for (const span of spans) {
    const parts = span.text.split(hard ? /(\n)/ : /(\n| +)/);
    for (const part of parts) {
      if (part === "") {
        continue;
      }
      if (part === "\n") {
        breakLine();
        continue;
      }
      const isSpace = !hard && part.trim() === "";
      if (isSpace) {
        // No spaces at the start of a wrapped line.
        if (used > 0 && used < max) {
          put(span, part.slice(0, max - used));
        }
        continue;
      }
      const partWidth = stringWidth(part);
      if (!hard && used > 0 && used + partWidth > max) {
        breakLine();
      }
      if (used + partWidth <= max) {
        put(span, part);
        continue;
      }
      // Longer than the room left: fill the line, continue on the next.
      let rest = part;
      while (rest !== "") {
        if (used >= max) {
          breakLine();
        }
        const [piece = rest] = splitByWidth(rest, max - used);
        if (used > 0 && stringWidth(piece) > max - used) {
          breakLine();
          continue;
        }
        put(span, piece);
        rest = rest.slice(piece.length);
      }
    }
  }
  if (line.length > 0 || lines.length === 0) {
    breakLine();
  }
  return lines;
};

const pad = (line: Line, width: number, align: string | null): Line => {
  const room = Math.max(0, width - lineWidth(line));
  if (room === 0) {
    return line;
  }
  if (align === "right") {
    return [{ text: " ".repeat(room) }, ...line];
  }
  if (align === "center") {
    const left = Math.floor(room / 2);
    return [
      { text: " ".repeat(left) },
      ...line,
      { text: " ".repeat(room - left) },
    ];
  }
  return [...line, { text: " ".repeat(room) }];
};

/** Prefixes the first line with `first` and the rest with `rest`. */
const prefix = (lines: Line[], first: Span, rest: Span = first): Line[] =>
  lines.map((line, index) => [index === 0 ? first : rest, ...line]);

// --- Blocks -----------------------------------------------------------------

const listLines = (list: Tokens.List, width: number): Line[] =>
  list.items.flatMap((item, index) => {
    const start = typeof list.start === "number" ? list.start : 1;
    let marker = list.ordered ? `${start + index}.` : "•";
    if (item.task) {
      marker += item.checked ? " [x]" : " [ ]";
    }
    const indent = stringWidth(marker) + 1;
    const body = blocks(item.tokens, width - indent, !list.loose);
    return prefix(
      body.length > 0 ? body : [[]],
      { text: `${marker} `, dim: !list.ordered && !item.task },
      { text: " ".repeat(indent) },
    );
  });

const SEPARATOR = " │ ";

/**
 * Columns are sized to content. If the table is wider than `width`, the
 * widest columns shrink first and their cells wrap onto more lines. Once a
 * row takes several lines, rows get a rule between them, so it is clear
 * where one ends.
 */
const tableLines = (table: Tokens.Table, width: number): Line[] => {
  const header = table.header.map((cell) =>
    inline(cell.tokens, { bold: true }),
  );
  const rows = table.rows.map((cells) =>
    cells.map((cell) => inline(cell.tokens)),
  );
  const columns = header.map((_, column) =>
    Math.max(
      1,
      ...[header, ...rows].map((cells) => lineWidth(cells[column] ?? [])),
    ),
  );
  const room = width - SEPARATOR.length * (columns.length - 1);
  while (columns.reduce((a, b) => a + b, 0) > room) {
    const widest = columns.indexOf(Math.max(...columns));
    if ((columns[widest] ?? 1) <= 1) {
      break;
    }
    columns[widest] = (columns[widest] ?? 1) - 1;
  }

  /** One table row, as many screen lines as its tallest cell needs. */
  const row = (cells: Line[]): Line[] => {
    const wrapped = columns.map((columnWidth, column) =>
      wrapSpans(cells[column] ?? [], columnWidth),
    );
    const height = Math.max(...wrapped.map((lines) => lines.length));
    return Array.from({ length: height }, (_, index) =>
      columns.flatMap((columnWidth, column) => [
        ...(column > 0 ? [{ text: SEPARATOR, dim: true }] : []),
        ...pad(
          wrapped[column]?.[index] ?? [],
          columnWidth,
          table.align[column] ?? null,
        ),
      ]),
    );
  };
  const rule: Line = [
    {
      text: columns.map((columnWidth) => "─".repeat(columnWidth)).join("─┼─"),
      dim: true,
    },
  ];
  const body = rows.map(row);
  const isWrapped = body.some((lines) => lines.length > 1);
  return [
    ...row(header),
    rule,
    ...body.flatMap((lines, index) =>
      isWrapped && index > 0 ? [rule, ...lines] : lines,
    ),
  ];
};

const block = (token: Token, width: number): Line[] | undefined => {
  switch (token.type) {
    case "space":
    case "checkbox":
      return undefined;
    case "heading":
      return wrapSpans(
        inline(token.tokens, {
          bold: true,
          color: token.depth <= 2 ? HEADING_COLOR : undefined,
        }),
        width,
      );
    case "paragraph":
      return wrapSpans(inline(token.tokens), width);
    case "text":
      return wrapSpans(inlineToken(token, {}), width);
    case "code":
      return prefix(
        wrapSpans([{ text: token.text, color: CODE_COLOR }], width - 2, true),
        { text: "  " },
      );
    case "blockquote":
      return prefix(blocks(token.tokens, width - 2), {
        text: "│ ",
        dim: true,
      });
    case "list":
      return listLines(token as Tokens.List, width);
    case "table":
      return tableLines(token as Tokens.Table, width);
    case "hr":
      return [[{ text: "─".repeat(Math.max(1, width)), dim: true }]];
    default:
      return wrapSpans([{ text: token.raw.trimEnd() }], width);
  }
};

/** Renders blocks, separated by a blank line unless `tight`. */
const blocks = (
  tokens: readonly Token[] = [],
  width: number,
  tight = false,
): Line[] => {
  const lines: Line[] = [];
  for (const token of tokens) {
    const rendered = block(token, Math.max(1, width));
    if (!rendered) {
      continue;
    }
    if (lines.length > 0 && !tight) {
      lines.push([]);
    }
    lines.push(...rendered);
  }
  return lines;
};

/**
 * Renders Markdown into screen lines no wider than `width`. Control
 * characters are stripped first, so the file can't drive the terminal.
 */
const renderMarkdown = (markdown: string, width: number): Line[] =>
  blocks(new Lexer({ gfm: true }).lex(toDisplayText(markdown)), width);

export default renderMarkdown;
