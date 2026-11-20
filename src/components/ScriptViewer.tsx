import { Box, Text, useInput, useWindowSize } from "ink";
import { useState } from "react";
import wrapAnsi from "wrap-ansi";

import toDisplayText from "../utils/toDisplayText";

interface ScriptViewerProps {
  name: string;
  script: string;
  onClose: () => void;
  /** Runs the script, same as Enter in the list. */
  onRun: () => void;
}

function ScriptViewer({ name, script, onClose, onRun }: ScriptViewerProps) {
  const { rows, columns } = useWindowSize();
  const [offset, setOffset] = useState(0);
  const lines = wrapAnsi(toDisplayText(script), Math.max(1, columns - 6), {
    hard: true,
    wordWrap: false,
    trim: false,
  }).split("\n");
  const availableHeight = Math.max(1, rows - 4);
  const hasScroll = lines.length > availableHeight;
  const height = Math.max(1, availableHeight - (hasScroll ? 1 : 0));
  const maxOffset = Math.max(0, lines.length - height);
  const currentOffset = Math.min(offset, maxOffset);

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
      <Box
        height={height}
        flexShrink={0}
        flexDirection="column"
        overflow="hidden"
      >
        {lines
          .slice(currentOffset, currentOffset + height)
          .map((line, index) => (
            <Text key={currentOffset + index} wrap="truncate-end">
              {line || " "}
            </Text>
          ))}
      </Box>
      <Text dimColor wrap="truncate-end">
        ↑↓ Scroll · Enter Run · Space / Esc Back
      </Text>
      {hasScroll && (
        <Text dimColor>
          {currentOffset + 1}–{Math.min(currentOffset + height, lines.length)} /{" "}
          {lines.length}
        </Text>
      )}
    </Box>
  );
}

export default ScriptViewer;
