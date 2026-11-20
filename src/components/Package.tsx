import { Box, Text, useApp, useWindowSize } from "ink";
import { useState } from "react";

import { getConfig } from "../config/config";
import type { Favorite } from "../loadConfig";
import { favoritesFor } from "../utils/favorites";
import orderScripts, { type ScriptEntry } from "../utils/orderScripts";
import Command, { hasMarkers } from "./Command";
import useKeyInput from "./package/useKeyInput";
import ScriptPreview, { PREVIEW_HEIGHT } from "./ScriptPreview";
import ScriptViewer from "./ScriptViewer";
import useFavorites from "./useFavorites";
import useScrollOffset from "./useScrollOffset";

// In single-package mode the config lives next to package.json.
const ROOT_KEY = ".";

interface AppProps {
  scripts: Record<string, string>;
  onSelect: (script: string) => void;
}

function App({ scripts, onSelect }: AppProps) {
  const { rows } = useWindowSize();
  const { exit } = useApp();
  const [isViewing, setIsViewing] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const { favorites, toggle, error } = useFavorites();
  const config = getConfig().scripts;
  const pinned = favoritesFor(config.pinned, ROOT_KEY);
  const hidden = favoritesFor(config.hidden, ROOT_KEY);
  const order = (current: readonly Favorite[], withHidden: boolean) =>
    orderScripts(
      scripts,
      favoritesFor(current, ROOT_KEY),
      pinned,
      hidden,
      withHidden,
    );
  const entries = order(favorites, showHidden);

  // Selects `name` in the new list. If it is gone (a hidden script that
  // stopped being a favorite, or hidden were turned off), stays at the same
  // position, clamped to the shorter list.
  const indexIn = (nextEntries: ScriptEntry[], name: string | undefined) => {
    const nextIndex = nextEntries.findIndex((entry) => entry.name === name);
    if (nextIndex !== -1) {
      return nextIndex;
    }
    const currentIndex = entries.findIndex((entry) => entry.name === name);
    return Math.max(0, Math.min(currentIndex, nextEntries.length - 1));
  };

  const { selectedIndex } = useKeyInput({
    scriptNames: entries.map((entry) => entry.name),
    onSelect,
    pageSize: Math.max(1, Math.floor(rows / 2)),
    onPreview: () => setIsViewing(true),
    onToggleFavorite: (name) => {
      const next = toggle({ package: ROOT_KEY, script: name });
      return indexIn(order(next, showHidden), name);
    },
    onToggleHidden: (name) => {
      setShowHidden(!showHidden);
      return indexIn(order(favorites, !showHidden), name);
    },
    isActive: !isViewing,
  });
  const selectedScript = entries[selectedIndex]?.script;
  const showMarker = hasMarkers(entries);
  const visibleRows = Math.max(1, rows - 6 - PREVIEW_HEIGHT);
  const offset = useScrollOffset(selectedIndex, entries.length, visibleRows);

  if (isViewing) {
    return (
      <ScriptViewer
        name={entries[selectedIndex]?.name ?? ""}
        script={selectedScript ?? ""}
        onClose={() => setIsViewing(false)}
        onRun={() => {
          const name = entries[selectedIndex]?.name;
          if (name !== undefined) {
            onSelect(name);
            exit();
          }
        }}
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
          {showHidden ? " Runpad · showing hidden " : " Runpad "}
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
          .map(({ name, script, isFavorite, isPinned, isHidden }, i) => {
            return (
              <Command
                key={name}
                isSelected={offset + i === selectedIndex}
                name={name}
                script={script}
                isFavorite={isFavorite}
                isPinned={isPinned}
                isHidden={isHidden}
                showMarker={showMarker}
              />
            );
          })}
      </Box>
      <ScriptPreview script={selectedScript} />
      <Box paddingX={1}>
        {error ? (
          <Text color="red" wrap="truncate-end">
            {error}
          </Text>
        ) : (
          <Text dimColor wrap="truncate-end">
            ←↑↓→ Navigate · Enter Select · Space View · F Favorite
            {hidden.length > 0 && " · H Hidden"} · Esc Exit
          </Text>
        )}
      </Box>
    </Box>
  );
}

export default App;
