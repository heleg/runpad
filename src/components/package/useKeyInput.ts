import { useApp, useInput } from "ink";
import { useState } from "react";

const useKeyInput = ({
  scriptNames,
  onSelect,
  pageSize,
  onPreview,
  onToggleFavorite,
  onToggleHidden,
  isActive = true,
}: {
  scriptNames: readonly string[];
  onSelect: (script: string) => void;
  pageSize: number;
  onPreview: () => void;
  /** Returns the script's index in the reordered list. */
  onToggleFavorite: (script: string) => number;
  /**
   * Shows or hides hidden scripts. Gets the selected script, if any, and
   * returns the index to select in the new list.
   */
  onToggleHidden: (script: string | undefined) => number;
  isActive?: boolean;
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { exit } = useApp();

  const visibleRows = pageSize;
  const scriptCount = scriptNames.length;

  useInput(
    (input, key) => {
      // Shift and Caps Lock send upper case; letter keys work either way.
      const letter = input.toLowerCase();
      if (input === " ") {
        if (scriptNames[selectedIndex] !== undefined) {
          onPreview();
        }
        return;
      }
      if (letter === "f") {
        const script = scriptNames[selectedIndex];
        if (script !== undefined) {
          setSelectedIndex(onToggleFavorite(script));
        }
        return;
      }
      if (letter === "h") {
        setSelectedIndex(onToggleHidden(scriptNames[selectedIndex]));
        return;
      }
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      }

      if (key.downArrow) {
        setSelectedIndex((i) => Math.max(0, Math.min(scriptCount - 1, i + 1)));
      }

      if (key.return) {
        const script = scriptNames[selectedIndex];

        if (script !== undefined) {
          onSelect(script);
          exit();
        }
      }

      if (key.leftArrow) {
        setSelectedIndex((i) => Math.max(0, i - visibleRows));
      }

      if (key.rightArrow) {
        setSelectedIndex((i) =>
          i + visibleRows < scriptCount ? i + visibleRows : i,
        );
      }

      if (key.escape || letter === "q") {
        exit();
      }
    },
    { isActive },
  );

  return { selectedIndex };
};

export default useKeyInput;
