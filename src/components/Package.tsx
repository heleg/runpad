import { Box, Text, useApp, useWindowSize } from "ink";
import { useState } from "react";

import { getConfig } from "../config/config";
import type { Favorite } from "../loadConfig";
import { descriptionFor, favoritesFor } from "../utils/favorites";
import orderScripts, { type ScriptEntry } from "../utils/orderScripts";
import Command, { hasMarkers } from "./Command";
import ConfirmRun from "./ConfirmRun";
import HelpView, { type HelpKey } from "./HelpView";
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
  /** C on a script: copy its command; RunPad exits right after. */
  onCopy: (script: string) => void;
}

function App({ scripts, onSelect, onCopy }: AppProps) {
  const { rows } = useWindowSize();
  const { exit } = useApp();
  const [isViewing, setIsViewing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const { favorites, toggle, error } = useFavorites();
  const config = getConfig().scripts;
  const pinned = favoritesFor(config.pinned, ROOT_KEY);
  const hidden = favoritesFor(config.hidden, ROOT_KEY);
  const confirm = new Set(favoritesFor(config.confirm, ROOT_KEY));
  const copy = (name: string) => {
    onCopy(name);
    exit();
  };
  const run = (name: string) => {
    onSelect(name);
    exit();
  };
  // Scripts from `scripts.confirm` ask first, from the list and the viewer.
  const requestRun = (name: string) => {
    if (confirm.has(name)) {
      setIsConfirming(true);
    } else {
      run(name);
    }
  };
  const order = (current: readonly Favorite[], withHidden: boolean) =>
    orderScripts(
      scripts,
      favoritesFor(current, ROOT_KEY),
      pinned,
      hidden,
      withHidden,
    );
  const entries = order(favorites, showHidden);
  const { lastRun } = getConfig();
  const lastRunName =
    lastRun?.package === ROOT_KEY ? lastRun.script : undefined;

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
    onRun: requestRun,
    onCopy: copy,
    onHelp: () => setIsHelpOpen(true),
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
    isActive: !isViewing && !isConfirming && !isHelpOpen,
    // Start on the script run last time, so repeating it is just Enter.
    initialIndex: Math.max(
      0,
      entries.findIndex((entry) => entry.name === lastRunName),
    ),
  });
  const selectedScript = entries[selectedIndex]?.script;
  const selectedName = entries[selectedIndex]?.name;
  const selectedDescription =
    selectedName === undefined
      ? undefined
      : descriptionFor(config.descriptions, {
          package: ROOT_KEY,
          script: selectedName,
        });
  const showMarker = hasMarkers(entries);
  const visibleRows = Math.max(1, rows - 6 - PREVIEW_HEIGHT);
  const offset = useScrollOffset(selectedIndex, entries.length, visibleRows);

  if (isHelpOpen) {
    const keys: HelpKey[] = [
      { keys: "↑↓", action: "Navigate" },
      { keys: "←→", action: "Page up, page down" },
      { keys: "Enter", action: "Run the script" },
      { keys: "Space", action: "View script details" },
      { keys: "C", action: "Copy the command and exit" },
      { keys: "F", action: "Add or remove a favorite" },
      ...(hidden.length > 0
        ? [{ keys: "H", action: "Show or hide hidden scripts" }]
        : []),
      { keys: "?", action: "This help" },
      { keys: "Esc, Q", action: "Exit" },
    ];
    return <HelpView keys={keys} onClose={() => setIsHelpOpen(false)} />;
  }

  if (isConfirming && selectedName !== undefined) {
    return (
      <ConfirmRun
        name={selectedName}
        script={selectedScript ?? ""}
        description={selectedDescription?.description}
        onConfirm={() => run(selectedName)}
        onCancel={() => setIsConfirming(false)}
      />
    );
  }

  if (isViewing) {
    return (
      <ScriptViewer
        name={entries[selectedIndex]?.name ?? ""}
        script={selectedScript ?? ""}
        description={selectedDescription?.description}
        details={selectedDescription?.details}
        detailsFile={selectedDescription?.detailsFile}
        detailsWidth={getConfig().viewer.detailsWidth}
        onClose={() => setIsViewing(false)}
        onRun={() => {
          if (selectedName !== undefined) {
            requestRun(selectedName);
          }
        }}
        onCopy={() => {
          if (selectedName !== undefined) {
            copy(selectedName);
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
                needsConfirm={confirm.has(name)}
                isLastRun={name === lastRunName}
                hasDetails={
                  descriptionFor(config.descriptions, {
                    package: ROOT_KEY,
                    script: name,
                  })?.details !== undefined
                }
                showMarker={showMarker}
              />
            );
          })}
      </Box>
      <ScriptPreview
        script={selectedScript}
        description={selectedDescription?.description}
        isLastRun={selectedName !== undefined && selectedName === lastRunName}
      />
      <Box paddingX={1}>
        {error ? (
          <Text color="red" wrap="truncate-end">
            {error}
          </Text>
        ) : (
          <Text dimColor wrap="truncate-end">
            ↑↓←→ Navigate · Enter Run · Space View · ? Help · Esc Exit
          </Text>
        )}
      </Box>
    </Box>
  );
}

export default App;
