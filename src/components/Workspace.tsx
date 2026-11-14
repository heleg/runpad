import { Box, Text, useApp, useInput, useWindowSize } from "ink";
import { useState } from "react";

import Command from "./Command";
import ScriptPreview, { PREVIEW_HEIGHT } from "./ScriptPreview";
import ScriptViewer from "./ScriptViewer";
import useScrollOffset from "./useScrollOffset";

export interface WorkspacePackage {
  name: string;
  packageJsonPath: string;
  isRoot?: boolean;
  scripts: Record<string, string>;
}

interface WorkspaceProps {
  packages: WorkspacePackage[];
  onSelect: (workspacePackage: WorkspacePackage, script: string) => void;
}

function Workspace({ packages, onSelect }: WorkspaceProps) {
  const { rows } = useWindowSize();
  const [isViewing, setIsViewing] = useState(false);
  const { exit } = useApp();
  const [packageIndex, setPackageIndex] = useState(0);
  const [scriptIndex, setScriptIndex] = useState(0);
  const [activeColumn, setActiveColumn] = useState<"packages" | "scripts">(
    "packages",
  );
  const selectedPackageIndex = Math.min(
    packageIndex,
    Math.max(0, packages.length - 1),
  );
  const selectedPackage = packages[selectedPackageIndex];
  const scripts = Object.entries(selectedPackage?.scripts ?? {});
  const selectedScriptIndex = Math.min(
    scriptIndex,
    Math.max(0, scripts.length - 1),
  );
  const showPreview = activeColumn === "scripts";
  const selectedScriptText = scripts[selectedScriptIndex]?.[1];
  const visibleRows = Math.max(1, rows - 7 - PREVIEW_HEIGHT);
  const packageOffset = useScrollOffset(
    selectedPackageIndex,
    packages.length,
    visibleRows,
  );
  const scriptOffset = useScrollOffset(
    selectedScriptIndex,
    scripts.length,
    visibleRows,
  );

  useInput(
    (input, key) => {
      if (input === " ") {
        if (showPreview && selectedScriptText !== undefined) {
          setIsViewing(true);
        }
        return;
      }
      if (key.escape || input === "q") {
        exit();
        return;
      }

      if (key.leftArrow) {
        setActiveColumn("packages");
        return;
      }

      if (key.rightArrow) {
        if (selectedPackage) {
          setActiveColumn("scripts");
        }
        return;
      }

      if (key.upArrow || key.downArrow) {
        const direction = key.downArrow ? 1 : -1;
        if (activeColumn === "packages") {
          const nextIndex = Math.max(
            0,
            Math.min(packages.length - 1, selectedPackageIndex + direction),
          );
          if (nextIndex !== selectedPackageIndex) {
            setPackageIndex(nextIndex);
            setScriptIndex(0);
          }
        } else {
          setScriptIndex(
            Math.max(
              0,
              Math.min(scripts.length - 1, selectedScriptIndex + direction),
            ),
          );
        }
        return;
      }

      if (key.return && activeColumn === "packages") {
        if (selectedPackage) {
          setActiveColumn("scripts");
        }
        return;
      }

      const selectedScript = scripts[selectedScriptIndex];
      if (key.return && selectedPackage && selectedScript) {
        onSelect(selectedPackage, selectedScript[0]);
        exit();
      }
    },
    { isActive: !isViewing },
  );

  if (isViewing) {
    return (
      <ScriptViewer
        name={scripts[selectedScriptIndex]?.[0] ?? ""}
        script={selectedScriptText ?? ""}
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
          {" Runpad · Workspace "}
        </Text>
      </Box>
      <Box marginX={2} columnGap={4} height={visibleRows + 1} flexShrink={0}>
        <Box width="30%" flexShrink={0} flexDirection="column">
          <Text
            bold
            color={activeColumn === "packages" ? "cyanBright" : "cyan"}
          >
            Packages
          </Text>
          {packages.length === 0 && <Text dimColor>No packages found</Text>}
          {packages
            .slice(packageOffset, packageOffset + visibleRows)
            .map((pkg, index) => {
              const isSelected = packageOffset + index === selectedPackageIndex;
              return (
                <Text
                  key={pkg.packageJsonPath}
                  bold={isSelected}
                  color={
                    isSelected && activeColumn === "packages"
                      ? "greenBright"
                      : "green"
                  }
                  wrap="truncate-end"
                >
                  {isSelected && activeColumn === "packages" ? "▸ " : "  "}
                  {pkg.name}
                  {pkg.isRoot && (
                    <Text bold color="#FFA500">
                      {" "}
                      [root]
                    </Text>
                  )}
                </Text>
              );
            })}
        </Box>
        <Box
          flexGrow={1}
          minWidth={0}
          flexShrink={1}
          flexDirection="column"
          overflow="hidden"
        >
          <Text bold color={activeColumn === "scripts" ? "cyanBright" : "cyan"}>
            Scripts
          </Text>
          {scripts.length === 0 && <Text dimColor>No scripts found</Text>}
          {scripts
            .slice(scriptOffset, scriptOffset + visibleRows)
            .map(([name, script], index) => (
              <Box key={name} height={1} flexShrink={0} overflow="hidden">
                <Command
                  isSelected={
                    activeColumn === "scripts" &&
                    scriptOffset + index === selectedScriptIndex
                  }
                  name={name}
                  script={script}
                />
              </Box>
            ))}
        </Box>
      </Box>
      <ScriptPreview script={selectedScriptText} hidden={!showPreview} />
      <Box paddingX={1}>
        <Text dimColor wrap="truncate-end">
          ←→ Column · ↑↓ Navigate · Enter Select · Space View · Esc Exit
        </Text>
      </Box>
    </Box>
  );
}

export default Workspace;
