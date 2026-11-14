import { useApp, useInput } from "ink";
import { useState } from "react";

const useKeyInput = ({
  scripts,
  onSelect,
  pageSize,
  onPreview,
  isActive = true,
}: {
  scripts: Record<string, string>;
  onSelect: (script: string) => void;
  pageSize: number;
  onPreview: () => void;
  isActive?: boolean;
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { exit } = useApp();

  const scriptNames = Object.keys(scripts);
  const visibleRows = pageSize;
  const scriptCount = Object.keys(scripts).length;

  useInput(
    (input, key) => {
      if (input === " ") {
        if (scriptNames[selectedIndex] !== undefined) {
          onPreview();
        }
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

      if (key.escape || input === "q") {
        exit();
      }
    },
    { isActive },
  );

  return { selectedIndex };
};

export default useKeyInput;
