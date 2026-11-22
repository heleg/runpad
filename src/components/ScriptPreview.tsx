import { Box, Text, useWindowSize } from "ink";
import type { ReactNode } from "react";
import wrapAnsi from "wrap-ansi";

import toDisplayText from "../utils/toDisplayText";

interface ScriptPreviewProps {
  script?: string;
  /** From config; takes the first line, the command gets the second. */
  description?: string;
  /** The script run last time: the frame says Enter repeats it. */
  isLastRun?: boolean;
}

const LINES = 2;

export const PREVIEW_HEIGHT = 4;

function ScriptPreview({
  script,
  description,
  isLastRun = false,
}: ScriptPreviewProps) {
  const { columns } = useWindowSize();
  const width = Math.max(1, columns - 12);
  const wrapOptions = { hard: true, wordWrap: false, trim: false };
  const lines = wrapAnsi(
    script === undefined ? "No script selected" : toDisplayText(script),
    width,
    wrapOptions,
  ).split("\n");
  const hasDescription =
    script !== undefined && description !== undefined && description !== "";
  const commandLines = hasDescription ? LINES - 1 : LINES;
  const visibleLines = lines.slice(0, commandLines);

  if (lines.length > commandLines) {
    const last = commandLines - 1;
    const lastLine =
      width > 1
        ? wrapAnsi(visibleLines[last], width - 1, wrapOptions).split("\n")[0]
        : "";
    visibleLines[last] = `${lastLine}…`;
  }

  return (
    <PreviewFrame
      label={isLastRun ? "↻ Last run · Enter to repeat" : undefined}
    >
      {hasDescription && (
        <Text dimColor italic wrap="truncate-end">
          {toDisplayText(description).replace(/\s+/g, " ")}
        </Text>
      )}
      <Text wrap="wrap" dimColor={script === undefined}>
        {visibleLines.join("\n")}
      </Text>
    </PreviewFrame>
  );
}

/** The preview box; `label` sits in its top border. */
const PreviewFrame = ({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) => (
  // The label is outside the bordered box: that one hides its overflow,
  // which would clip a label placed on the border.
  <Box height={PREVIEW_HEIGHT} marginX={2} flexShrink={0}>
    <Box
      flexGrow={1}
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      flexDirection="column"
      overflow="hidden"
    >
      {children}
    </Box>
    {label !== undefined && (
      <Box position="absolute" top={0} left={2}>
        <Text dimColor> {label} </Text>
      </Box>
    )}
  </Box>
);

interface PackagePreviewProps {
  /** `description` from package.json. */
  description?: string;
  /** Package directory relative to the workspace root, as in config. */
  path?: string;
}

/** Shown while the packages column is active. */
export function PackagePreview({ description, path }: PackagePreviewProps) {
  return (
    <PreviewFrame>
      <Text dimColor={!description} italic wrap="truncate-end">
        {description
          ? toDisplayText(description).replace(/\s+/g, " ")
          : "No description"}
      </Text>
      {path !== undefined && (
        <Text color="magenta" wrap="truncate-end">
          {path === "." ? "./" : `./${toDisplayText(path)}`}
        </Text>
      )}
    </PreviewFrame>
  );
}

export default ScriptPreview;
