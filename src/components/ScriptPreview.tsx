import { Box, Text, useWindowSize } from "ink";
import wrapAnsi from "wrap-ansi";

interface ScriptPreviewProps {
  script?: string;
  hidden?: boolean;
}

export const PREVIEW_HEIGHT = 4;

function ScriptPreview({ script, hidden = false }: ScriptPreviewProps) {
  const { columns } = useWindowSize();
  const width = Math.max(1, columns - 12);
  const wrapOptions = { hard: true, wordWrap: false, trim: false };
  const lines = wrapAnsi(
    script ?? "No script selected",
    width,
    wrapOptions,
  ).split("\n");
  const visibleLines = lines.slice(0, 2);

  if (lines.length > 2) {
    const lastLine =
      width > 1
        ? wrapAnsi(visibleLines[1], width - 1, wrapOptions).split("\n")[0]
        : "";
    visibleLines[1] = `${lastLine}…`;
  }

  if (hidden) {
    return <Box height={PREVIEW_HEIGHT} flexShrink={0} />;
  }
  return (
    <Box
      height={PREVIEW_HEIGHT}
      marginX={2}
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      flexShrink={0}
      overflow="hidden"
    >
      <Text wrap="wrap" dimColor={script === undefined}>
        {visibleLines.join("\n")}
      </Text>
    </Box>
  );
}

export default ScriptPreview;
