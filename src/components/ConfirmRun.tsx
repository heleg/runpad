import { Box, Text, useInput, useWindowSize } from "ink";

import { wrapSpans } from "../utils/markdown";
import toDisplayText from "../utils/toDisplayText";

interface ConfirmRunProps {
  /** Script name, with the package in a workspace: `api › db:reset`. */
  name: string;
  script: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Asks before running a script listed in `scripts.confirm`. Only `y` runs
 * it; any other key cancels, so a second Enter pressed by accident does
 * nothing.
 */
function ConfirmRun({
  name,
  script,
  description,
  onConfirm,
  onCancel,
}: ConfirmRunProps) {
  const { rows, columns } = useWindowSize();
  const width = Math.max(1, columns - 6);
  // The command breaks anywhere, as the terminal would print it.
  const commandLines = wrapSpans(
    [{ text: toDisplayText(script) }],
    width,
    true,
  );
  const hasDescription = description !== undefined && description !== "";

  useInput((input) => {
    if (input.toLowerCase() === "y") {
      onConfirm();
      return;
    }
    onCancel();
  });

  return (
    <Box
      height={rows}
      marginX={1}
      borderStyle="round"
      borderColor="red"
      paddingX={1}
      flexDirection="column"
    >
      <Text bold color="red" wrap="truncate-end">
        Run {toDisplayText(name)}?
      </Text>
      {hasDescription && (
        <Text dimColor italic wrap="truncate-end">
          {toDisplayText(description).replace(/\s+/g, " ")}
        </Text>
      )}
      <Text> </Text>
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        {commandLines.map((line, index) => (
          <Text key={index}>{line.map((span) => span.text).join("")}</Text>
        ))}
      </Box>
      <Text wrap="truncate-end">
        <Text bold color="red">
          y
        </Text>
        <Text dimColor> Run · any other key Cancel</Text>
      </Text>
    </Box>
  );
}

export default ConfirmRun;
