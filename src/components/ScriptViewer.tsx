import { Box, Text, useInput, useWindowSize } from "ink";
import { useMemo, useState } from "react";
import stringWidth from "string-width";

import renderMarkdown, { type Line, wrapSpans } from "../utils/markdown";
import scrollbarThumb from "../utils/scrollbar";
import toDisplayText from "../utils/toDisplayText";

// Heading rules stop here on wide terminals, so they don't run across the
// whole screen.
const HEADING_WIDTH = 60;

/** `── Details · docs/x.md ──────`, up to `HEADING_WIDTH`. */
const heading = (label: string, width: number, note?: string): Line => {
  const title = note === undefined ? label : `${label} · ${note}`;
  const rule = "─".repeat(
    Math.max(0, Math.min(width, HEADING_WIDTH) - stringWidth(title) - 4),
  );
  return [
    { text: "── ", bold: true, color: "cyan" },
    { text: label, bold: true, color: "cyan" },
    ...(note === undefined ? [] : [{ text: ` · ${note}`, color: "cyan" }]),
    { text: ` ${rule}`, bold: true, color: "cyan" },
  ];
};

/**
 * Renders Markdown at most `maxWidth` wide, centered in `width`. The
 * scrollbar stays at the window edge, outside this column.
 */
const centeredMarkdown = (
  markdown: string,
  width: number,
  maxWidth = Infinity,
): Line[] => {
  const textWidth = Math.min(maxWidth, width);
  const indent = Math.floor((width - textWidth) / 2);
  const lines = renderMarkdown(markdown, textWidth);
  return indent === 0
    ? lines
    : lines.map((line) =>
        line.length === 0 ? line : [{ text: " ".repeat(indent) }, ...line],
      );
};

const LineView = ({ line }: { line: Line }) => (
  <Text wrap="truncate-end">
    {line.length === 0
      ? " "
      : line.map((span, index) => (
          <Text
            key={index}
            bold={span.bold}
            italic={span.italic}
            strikethrough={span.strikethrough}
            underline={span.underline}
            dimColor={span.dim}
            color={span.color}
          >
            {span.text}
          </Text>
        ))}
  </Text>
);

interface ScriptViewerProps {
  name: string;
  script: string;
  description?: string;
  /** Markdown of `detailsFile`, shown below the command. */
  details?: string;
  /** Path of the details file, shown in the Details heading. */
  detailsFile?: string;
  /**
   * `viewer.detailsWidth` from the config: the details text wraps at this
   * width and is centered. Full width if not set or if the terminal is
   * narrower.
   */
  detailsWidth?: number;
  onClose: () => void;
  /** Runs the script, same as Enter in the list. */
  onRun: () => void;
  /** Copies the command and exits, same as C in the list. */
  onCopy: () => void;
}

function ScriptViewer({
  name,
  script,
  description,
  details,
  detailsFile,
  detailsWidth,
  onClose,
  onRun,
  onCopy,
}: ScriptViewerProps) {
  const { rows, columns } = useWindowSize();
  const [offset, setOffset] = useState(0);
  const width = Math.max(1, columns - 6);
  const hasDescription = description !== undefined && description !== "";
  // Text that doesn't fit gets a scrollbar on the right, in a column of its
  // own with a space before it, so it is laid out 2 cells narrower.
  const narrow = Math.max(1, width - 2);
  const detailLines = useMemo(
    () =>
      details === undefined
        ? undefined
        : {
            full: centeredMarkdown(details, width, detailsWidth),
            narrow: centeredMarkdown(details, narrow, detailsWidth),
          },
    [details, width, narrow, detailsWidth],
  );
  // With details there are two sections, each under its own heading.
  const sections = (lineWidth: number) => {
    // The command breaks anywhere, as the terminal would print it.
    const commandLines = wrapSpans(
      [{ text: toDisplayText(script) }],
      lineWidth,
      true,
    );
    if (detailLines === undefined) {
      return { header: [], body: commandLines };
    }
    return {
      header: [
        heading("Command", lineWidth),
        ...commandLines,
        [],
        heading(
          "Details",
          lineWidth,
          detailsFile === undefined ? undefined : toDisplayText(detailsFile),
        ),
      ],
      body: lineWidth === width ? detailLines.full : detailLines.narrow,
    };
  };
  const availableHeight = Math.max(
    1,
    rows - 4 - (hasDescription ? 1 : 0) - (details === undefined ? 0 : 1),
  );
  // The command is what Enter runs, so it stays on top with both headings
  // and only the details text scrolls. A command taller than half the
  // screen scrolls with it, so the details still get room and nothing is
  // cut.
  const full = sections(width);
  const isPinned = full.header.length <= Math.floor(availableHeight / 2);
  const pinnedLines: Line[] = isPinned ? full.header : [];
  const height = Math.max(1, availableHeight - pinnedLines.length);
  const scrolled = ({ header, body }: { header: Line[]; body: Line[] }) =>
    isPinned ? body : [...header, ...body];
  const hasScroll = scrolled(full).length > height;
  const lines = hasScroll ? scrolled(sections(narrow)) : scrolled(full);
  const maxOffset = Math.max(0, lines.length - height);
  const currentOffset = Math.min(offset, maxOffset);
  const thumb = scrollbarThumb(currentOffset, height, lines.length);

  useInput((input, key) => {
    // Shift and Caps Lock send upper case; letter keys work either way.
    const letter = input.toLowerCase();
    if (input === " " || key.escape || letter === "q") {
      onClose();
      return;
    }
    if (key.return) {
      onRun();
      return;
    }
    if (letter === "c") {
      onCopy();
      return;
    }
    if (key.upArrow) {
      setOffset(Math.max(0, currentOffset - 1));
    }
    if (key.downArrow) {
      setOffset(Math.min(maxOffset, currentOffset + 1));
    }
  });

  return (
    <Box
      height={rows}
      marginX={1}
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      flexDirection="column"
    >
      <Text bold color="greenBright" wrap="truncate-end">
        {toDisplayText(name)}
      </Text>
      {hasDescription && (
        <Text dimColor italic wrap="truncate-end">
          {toDisplayText(description).replace(/\s+/g, " ")}
        </Text>
      )}
      {details !== undefined && <Text> </Text>}
      {pinnedLines.map((line, index) => (
        <LineView key={`pinned-${index}`} line={line} />
      ))}
      <Box height={height} flexShrink={0} columnGap={1}>
        <Box flexGrow={1} flexDirection="column" overflow="hidden">
          {lines
            .slice(currentOffset, currentOffset + height)
            .map((line, index) => (
              <LineView key={currentOffset + index} line={line} />
            ))}
        </Box>
        {hasScroll && (
          <Box width={1} flexShrink={0} flexDirection="column">
            {Array.from({ length: height }, (_, index) =>
              index >= thumb.start && index < thumb.start + thumb.size ? (
                <Text key={index} color="cyan">
                  ┃
                </Text>
              ) : (
                <Text key={index} dimColor>
                  │
                </Text>
              ),
            )}
          </Box>
        )}
      </Box>
      <Text dimColor wrap="truncate-end">
        ↑↓ Scroll · Enter Run · C Copy · Space / Esc Back
      </Text>
    </Box>
  );
}

export default ScriptViewer;
