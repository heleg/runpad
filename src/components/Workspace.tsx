import { Box, Text, useApp, useInput, useWindowSize } from "ink";
import { useState } from "react";

import { getConfig } from "../config/config";
import type { Favorite } from "../loadConfig";
import {
  descriptionFor,
  favoritesFor,
  refId,
  resolveFavorites,
  withoutRefs,
} from "../utils/favorites";
import orderScripts from "../utils/orderScripts";
import toDisplayText from "../utils/toDisplayText";
import Command, { hasMarkers } from "./Command";
import ConfirmRun from "./ConfirmRun";
import HelpView, { type HelpKey } from "./HelpView";
import ScriptPreview, { PackagePreview, PREVIEW_HEIGHT } from "./ScriptPreview";
import ScriptViewer from "./ScriptViewer";
import useFavorites from "./useFavorites";
import useScrollOffset from "./useScrollOffset";

export interface WorkspacePackage {
  /** Directory relative to the workspace root, "." for the root package. */
  key: string;
  name: string;
  /** `name` from package.json, if it has one. */
  packageName?: string;
  /** `description` from package.json. */
  description?: string;
  packageJsonPath: string;
  isRoot?: boolean;
  /** The package RunPad was started in, unless that is the root. */
  isCurrent?: boolean;
  scripts: Record<string, string>;
}

interface WorkspaceProps {
  packages: WorkspacePackage[];
  onSelect: (workspacePackage: WorkspacePackage, script: string) => void;
  /** C on a script: copy its command; RunPad exits right after. */
  onCopy: (workspacePackage: WorkspacePackage, script: string) => void;
}

interface ScriptRow {
  id: string;
  pkg: WorkspacePackage;
  name: string;
  script: string;
  isFavorite: boolean;
  isPinned: boolean;
  isHidden: boolean;
  packageName?: string;
}

// Row 0 of the packages column is the ★ Favorites pseudo-package (personal
// favorites, then pinned from the shared config), real packages start at 1.
const FAVORITES_ROW = 0;

function Workspace({ packages, onSelect, onCopy }: WorkspaceProps) {
  const { rows } = useWindowSize();
  const [isViewing, setIsViewing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { exit } = useApp();
  const { favorites, toggle, error } = useFavorites();
  const [showHidden, setShowHidden] = useState(false);
  const {
    hidden,
    pinned: configPinned,
    confirm,
    descriptions,
  } = getConfig().scripts;
  const hiddenIds = new Set(hidden.map(refId));
  const confirmIds = new Set(confirm.map(refId));
  // Hidden beats pinned, unless hidden are shown; favorites always stay,
  // they are the user's own choice.
  const pinnedFor = (withHidden: boolean) =>
    withHidden ? configPinned : withoutRefs(configPinned, hidden);
  const { lastRun } = getConfig();
  const lastRunId = lastRun === undefined ? undefined : refId(lastRun);
  // Start on the script run last time, in its own package, so repeating
  // it is just Enter. If it is gone or hidden, start as usual.
  const [start] = useState(() => {
    const index = packages.findIndex((pkg) => pkg.key === lastRun?.package);
    const pkg = packages[index];
    if (!lastRun || !pkg) {
      return undefined;
    }
    const scriptIndex = orderScripts(
      pkg.scripts,
      favoritesFor(favorites, pkg.key),
      favoritesFor(pinnedFor(false), pkg.key),
      favoritesFor(hidden, pkg.key),
      false,
    ).findIndex((entry) => entry.name === lastRun.script);
    return scriptIndex === -1
      ? undefined
      : { packageIndex: index + 1, scriptIndex };
  });
  const [packageIndex, setPackageIndex] = useState(() => {
    if (start) {
      return start.packageIndex;
    }
    return resolveFavorites([...favorites, ...pinnedFor(false)], packages)
      .length > 0
      ? FAVORITES_ROW
      : 1;
  });
  const [scriptIndex, setScriptIndex] = useState(start?.scriptIndex ?? 0);
  const [activeColumn, setActiveColumn] = useState<"packages" | "scripts">(
    start ? "scripts" : "packages",
  );

  const packageRowCount = packages.length + 1;
  const selectedPackageIndex = Math.min(packageIndex, packageRowCount - 1);
  const isFavoritesSelected = selectedPackageIndex === FAVORITES_ROW;
  const selectedPackage = isFavoritesSelected
    ? undefined
    : packages[selectedPackageIndex - 1];

  const buildScriptRows = (
    current: readonly Favorite[],
    withHidden: boolean,
  ): ScriptRow[] => {
    const pinned = pinnedFor(withHidden);
    if (isFavoritesSelected) {
      const pinnedIds = new Set(pinned.map(refId));
      const favoriteIds = new Set(current.map(refId));
      return resolveFavorites([...current, ...pinned], packages).map(
        ({ pkg, favorite, script }) => {
          const id = refId(favorite);
          return {
            id,
            pkg,
            name: favorite.script,
            script,
            isPinned: pinnedIds.has(id),
            isFavorite: favoriteIds.has(id),
            isHidden: hiddenIds.has(id) && !favoriteIds.has(id),
            packageName: pkg.name,
          };
        },
      );
    }
    if (!selectedPackage) {
      return [];
    }
    return orderScripts(
      selectedPackage.scripts,
      favoritesFor(current, selectedPackage.key),
      favoritesFor(pinned, selectedPackage.key),
      favoritesFor(hidden, selectedPackage.key),
      withHidden,
    ).map((entry) => ({ id: entry.name, pkg: selectedPackage, ...entry }));
  };

  const scripts = buildScriptRows(favorites, showHidden);
  const showMarker = hasMarkers(scripts);
  const selectedScriptIndex = Math.min(
    scriptIndex,
    Math.max(0, scripts.length - 1),
  );
  const selectedRow = scripts[selectedScriptIndex];
  const selectedDescription = selectedRow
    ? descriptionFor(descriptions, {
        package: selectedRow.pkg.key,
        script: selectedRow.name,
      })
    : undefined;
  const copy = (row: ScriptRow) => {
    onCopy(row.pkg, row.name);
    exit();
  };
  const run = (row: ScriptRow) => {
    onSelect(row.pkg, row.name);
    exit();
  };
  // Scripts from `scripts.confirm` ask first, from the list and the viewer.
  const requestRun = (row: ScriptRow) => {
    if (confirmIds.has(refId({ package: row.pkg.key, script: row.name }))) {
      setIsConfirming(true);
    } else {
      run(row);
    }
  };
  const packageMark = (pkg: WorkspacePackage) => {
    if (pkg.isRoot) {
      return " [root]";
    }
    return pkg.isCurrent ? " [current]" : "";
  };
  const rowTitle = (row: ScriptRow | undefined) =>
    row === undefined
      ? ""
      : `${row.packageName ?? row.pkg.name}${packageMark(row.pkg)} › ${row.name}`;
  const showPreview = activeColumn === "scripts";
  const visibleRows = Math.max(1, rows - 7 - PREVIEW_HEIGHT);
  const packageOffset = useScrollOffset(
    selectedPackageIndex,
    packageRowCount,
    visibleRows,
  );
  const scriptOffset = useScrollOffset(
    selectedScriptIndex,
    scripts.length,
    visibleRows,
  );

  useInput(
    (input, key) => {
      // Shift and Caps Lock send upper case; letter keys work either way.
      const letter = input.toLowerCase();
      if (input === "?") {
        setIsHelpOpen(true);
        return;
      }
      if (input === " ") {
        // In the packages column Space opens the package, same as Enter.
        if (activeColumn === "packages") {
          setActiveColumn("scripts");
        } else if (selectedRow) {
          setIsViewing(true);
        }
        return;
      }
      if (letter === "f") {
        if (activeColumn === "scripts" && selectedRow) {
          const next = toggle({
            package: selectedRow.pkg.key,
            script: selectedRow.name,
          });
          // Follow the row if it moved. If it left the favorites list,
          // keep the index: it clamps to the next row.
          const nextIndex = buildScriptRows(next, showHidden).findIndex(
            (row) => row.id === selectedRow.id,
          );
          if (nextIndex !== -1) {
            setScriptIndex(nextIndex);
          }
        }
        return;
      }
      if (letter === "c") {
        if (activeColumn === "scripts" && selectedRow) {
          copy(selectedRow);
        }
        return;
      }
      if (letter === "h") {
        // Follow the selected row; if it gets hidden, keep the index:
        // it clamps to the next row.
        const nextIndex = buildScriptRows(favorites, !showHidden).findIndex(
          (row) => row.id === selectedRow?.id,
        );
        if (nextIndex !== -1) {
          setScriptIndex(nextIndex);
        }
        setShowHidden(!showHidden);
        return;
      }
      if (key.escape || letter === "q") {
        exit();
        return;
      }

      if (key.leftArrow) {
        setActiveColumn("packages");
        return;
      }

      if (key.rightArrow || (key.return && activeColumn === "packages")) {
        setActiveColumn("scripts");
        return;
      }

      if (key.upArrow || key.downArrow) {
        const direction = key.downArrow ? 1 : -1;
        if (activeColumn === "packages") {
          const nextIndex = Math.max(
            0,
            Math.min(packageRowCount - 1, selectedPackageIndex + direction),
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

      if (key.return && selectedRow) {
        requestRun(selectedRow);
      }
    },
    { isActive: !isViewing && !isConfirming && !isHelpOpen },
  );

  if (isHelpOpen) {
    const keys: HelpKey[] = [
      { keys: "↑↓", action: "Navigate" },
      { keys: "←→", action: "Switch column" },
      { keys: "Enter", action: "Open package, run script" },
      { keys: "Space", action: "Open package, view script details" },
      { keys: "C", action: "Copy the command and exit" },
      { keys: "F", action: "Add or remove a favorite" },
      ...(hidden.length > 0
        ? [{ keys: "H", action: "Show or hide hidden scripts" }]
        : []),
      { keys: "?", action: "This help" },
      { keys: "Esc, Q", action: "Exit" },
    ];
    return (
      <HelpView keys={keys} isWorkspace onClose={() => setIsHelpOpen(false)} />
    );
  }

  if (isConfirming && selectedRow) {
    return (
      <ConfirmRun
        name={rowTitle(selectedRow)}
        script={selectedRow.script}
        description={selectedDescription?.description}
        onConfirm={() => run(selectedRow)}
        onCancel={() => setIsConfirming(false)}
      />
    );
  }

  if (isViewing) {
    return (
      <ScriptViewer
        name={rowTitle(selectedRow)}
        script={selectedRow?.script ?? ""}
        description={selectedDescription?.description}
        details={selectedDescription?.details}
        detailsFile={selectedDescription?.detailsFile}
        detailsWidth={getConfig().viewer.detailsWidth}
        onClose={() => setIsViewing(false)}
        onRun={() => {
          if (selectedRow) {
            requestRun(selectedRow);
          }
        }}
        onCopy={() => {
          if (selectedRow) {
            copy(selectedRow);
          }
        }}
      />
    );
  }

  const packageRows = [undefined, ...packages];

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
          {showHidden
            ? " Runpad · Workspace · showing hidden "
            : " Runpad · Workspace "}
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
          {packageRows
            .slice(packageOffset, packageOffset + visibleRows)
            .map((pkg, index) => {
              const isSelected = packageOffset + index === selectedPackageIndex;
              const isActive = isSelected && activeColumn === "packages";
              const cursor = isActive ? "▸ " : "  ";

              if (!pkg) {
                return (
                  <Text
                    key="\0favorites"
                    bold={isSelected}
                    color={isActive ? "yellowBright" : "yellow"}
                    wrap="truncate-end"
                  >
                    {cursor}★ Favorites
                  </Text>
                );
              }

              return (
                <Text
                  key={pkg.packageJsonPath}
                  bold={isSelected}
                  color={isActive ? "greenBright" : "green"}
                  wrap="truncate-end"
                >
                  {cursor}
                  {toDisplayText(pkg.name)}
                  {pkg.isRoot && (
                    <Text bold color="#FFA500">
                      {" "}
                      [root]
                    </Text>
                  )}
                  {pkg.isCurrent && (
                    <Text bold color="cyan">
                      {" "}
                      [current]
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
          {scripts.length === 0 && (
            <Text dimColor>
              {isFavoritesSelected
                ? "No favorites yet · press F on a script"
                : "No scripts found"}
            </Text>
          )}
          {scripts
            .slice(scriptOffset, scriptOffset + visibleRows)
            .map((row, index) => (
              <Box key={row.id} height={1} flexShrink={0} overflow="hidden">
                <Command
                  isSelected={
                    activeColumn === "scripts" &&
                    scriptOffset + index === selectedScriptIndex
                  }
                  name={row.name}
                  script={row.script}
                  isFavorite={row.isFavorite}
                  isPinned={row.isPinned}
                  isHidden={row.isHidden}
                  isLastRun={
                    refId({ package: row.pkg.key, script: row.name }) ===
                    lastRunId
                  }
                  needsConfirm={confirmIds.has(
                    refId({ package: row.pkg.key, script: row.name }),
                  )}
                  hasDetails={
                    descriptionFor(descriptions, {
                      package: row.pkg.key,
                      script: row.name,
                    })?.details !== undefined
                  }
                  showMarker={showMarker}
                  packageName={row.packageName}
                  isRootPackage={row.pkg.isRoot}
                  isCurrentPackage={row.pkg.isCurrent}
                />
              </Box>
            ))}
        </Box>
      </Box>
      {showPreview ? (
        <ScriptPreview
          script={selectedRow?.script}
          description={selectedDescription?.description}
          isLastRun={
            selectedRow !== undefined &&
            refId({
              package: selectedRow.pkg.key,
              script: selectedRow.name,
            }) === lastRunId
          }
        />
      ) : (
        <PackagePreview
          description={
            isFavoritesSelected
              ? "Your favorites and scripts pinned for the team"
              : selectedPackage?.description
          }
          path={selectedPackage?.key}
        />
      )}
      <Box paddingX={1}>
        {error ? (
          <Text color="red" wrap="truncate-end">
            {error}
          </Text>
        ) : (
          <Text dimColor wrap="truncate-end">
            ↑↓←→ Navigate · Enter Select · Space View · ? Help · Esc Exit
          </Text>
        )}
      </Box>
    </Box>
  );
}

export default Workspace;
