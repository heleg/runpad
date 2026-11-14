import { Box, Text, useWindowSize } from "ink";
import { useState } from "react";

import Command from "./Command";
import useKeyInput from "./package/useKeyInput";
import ScriptPreview, { PREVIEW_HEIGHT } from "./ScriptPreview";
import ScriptViewer from "./ScriptViewer";
import useScrollOffset from "./useScrollOffset";

interface AppProps {
  scripts: Record<string, string>;
  onSelect: (script: string) => void;
}

function App({ scripts, onSelect }: AppProps) {
  const { rows } = useWindowSize();
  const [isViewing, setIsViewing] = useState(false);

  const { selectedIndex } = useKeyInput({
    scripts,
    onSelect,
    pageSize: Math.max(1, Math.floor(rows / 2)),
    onPreview: () => setIsViewing(true),
    isActive: !isViewing,
  });
  const entries = Object.entries(scripts);
  const selectedScript = entries[selectedIndex]?.[1];
  const visibleRows = Math.max(1, rows - 6 - PREVIEW_HEIGHT);
  const offset = useScrollOffset(selectedIndex, entries.length, visibleRows);

  if (isViewing) {
    return (
      <ScriptViewer
        name={entries[selectedIndex]?.[0] ?? ""}
        script={selectedScript ?? ""}
        onClose={() => setIsViewing(false)}
      />
    );
  }

  return (
    <Box
      height={rows}
      flexDirection="column"
      borderStyle="single"
      marginX={1}
      gap={1}
      paddingTop={1}
    >
      <Box position="absolute" top={-1} left={2}>
        <Text bold color="cyan">
          {" Runpad "}
        </Text>
      </Box>
      <Box
        marginX={2}
        flexDirection="column"
        height={visibleRows}
        flexShrink={0}
        columnGap={4}
        alignContent="flex-start"
      >
        {entries.length === 0 && <Text dimColor>No scripts found</Text>}
        {entries
          .slice(offset, offset + visibleRows)
          .map(([name, script], i) => {
            return (
              <Command
                key={name}
                isSelected={offset + i === selectedIndex}
                name={name}
                script={script}
              />
            );
          })}
      </Box>
      <ScriptPreview script={selectedScript} />
      <Box paddingX={1}>
        <Text dimColor wrap="truncate-end">
          ←↑↓→ Navigate · Enter Select · Space View · Esc Exit
        </Text>
      </Box>
    </Box>
  );
}

export default App;
