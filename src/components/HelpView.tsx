import { Box, Text, useInput, useWindowSize } from "ink";

export interface HelpKey {
  keys: string;
  action: string;
}

interface Mark {
  symbol: string;
  color?: string;
  dim?: boolean;
  meaning: string;
  /** Only in a workspace. */
  workspaceOnly?: boolean;
}

// Same symbols and colors as the list draws them.
const MARKS: Mark[] = [
  { symbol: "★", color: "yellow", meaning: "Your favorite" },
  {
    symbol: "⚑",
    color: "cyan",
    meaning: "Pinned for the team, yellow if also your favorite",
  },
  { symbol: "ⓘ", color: "cyan", meaning: "Has details, Space to read" },
  { symbol: "⚠", color: "red", meaning: "Asks before running" },
  { symbol: "↻", dim: true, meaning: "Run last time, selected on start" },
  { symbol: "name", dim: true, meaning: "Hidden by config, shown with H" },
  {
    symbol: "[root]",
    color: "#FFA500",
    meaning: "Workspace root",
    workspaceOnly: true,
  },
  {
    symbol: "[current]",
    color: "cyan",
    meaning: "Package RunPad was started in",
    workspaceOnly: true,
  },
];

interface HelpViewProps {
  /** Keys of the screen the help was opened from. */
  keys: readonly HelpKey[];
  isWorkspace?: boolean;
  onClose: () => void;
}

/** Keys and list marks, opened with `?`; any key closes it. */
function HelpView({ keys, isWorkspace = false, onClose }: HelpViewProps) {
  const { rows } = useWindowSize();
  useInput(() => onClose());

  const marks = MARKS.filter((mark) => isWorkspace || !mark.workspaceOnly);
  const keyWidth = Math.max(...keys.map((key) => key.keys.length));
  const markWidth = Math.max(...marks.map((mark) => mark.symbol.length));

  return (
    <Box
      height={rows}
      marginX={1}
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      flexDirection="column"
      overflow="hidden"
    >
      <Text bold color="cyan">
        Keys
      </Text>
      {keys.map((key) => (
        <Text key={key.keys} wrap="truncate-end">
          <Text bold>{key.keys.padEnd(keyWidth)}</Text>
          {"  "}
          {key.action}
        </Text>
      ))}
      <Text> </Text>
      <Text bold color="cyan">
        Marks
      </Text>
      {marks.map((mark) => (
        <Text key={mark.symbol} wrap="truncate-end">
          <Text color={mark.color} dimColor={mark.dim}>
            {mark.symbol}
          </Text>
          {/* Wide-drawn glyphs get the padding to spill into. */}
          {" ".repeat(markWidth - mark.symbol.length + 2)}
          {mark.meaning}
        </Text>
      ))}
      <Box flexGrow={1} />
      <Text dimColor>Any key Back</Text>
    </Box>
  );
}

export default HelpView;
