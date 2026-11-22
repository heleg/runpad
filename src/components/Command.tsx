import { Box, Text } from "ink";

import toDisplayText from "../utils/toDisplayText";

interface CommandProps {
  isSelected: boolean;
  name: string;
  script: string;
  isFavorite?: boolean;
  isPinned?: boolean;
  /**
   * Whether the whole list reserves the marker column. Every row of a list
   * gets the same column, filled or blank, so script names stay aligned.
   */
  showMarker?: boolean;
  /** Shown before the script name, e.g. in the workspace favorites list. */
  packageName?: string;
  /** Marks `packageName` as the workspace root. */
  isRootPackage?: boolean;
  /** Marks `packageName` as the package RunPad was started in. */
  isCurrentPackage?: boolean;
  /** Hidden by config, shown only on request: drawn dimmed. */
  isHidden?: boolean;
  /** Has a `detailsFile`, opened with Space: marked after the name. */
  hasDetails?: boolean;
  /** Run last time in this project: marked after the name. */
  isLastRun?: boolean;
  /** Listed in `scripts.confirm`: asks before running, marked after the name. */
  needsConfirm?: boolean;
}

// Pinned and favorite share one column, so ⚑ and ★ line up. A script that is
// both shows ⚑ in the favorite color. Some fonts draw ⚑ wider than its
// cell, so the marker is followed by a space.
const PIN = "⚑";
const STAR = "★";
const PINNED_COLOR = "cyan";
const FAVORITE_COLOR = "yellow";
// Right after the name, so nothing after it needs to line up. Many fonts
// draw ⓘ and ⚠ wider than their cell, so each gets a space of its own to spill into,
// like the ⚑ / ★ marker.
const DETAILS = "ⓘ";
const CONFIRM = "⚠";
const LAST_RUN = "↻";

/** Whether any entry of a list has a marker. */
export const hasMarkers = (
  entries: readonly { isPinned: boolean; isFavorite: boolean }[],
): boolean => entries.some((entry) => entry.isPinned || entry.isFavorite);

const marker = (isPinned: boolean, isFavorite: boolean) => {
  if (isPinned) {
    return { symbol: PIN, color: isFavorite ? FAVORITE_COLOR : PINNED_COLOR };
  }
  if (isFavorite) {
    return { symbol: STAR, color: FAVORITE_COLOR };
  }
  return { symbol: " ", color: undefined };
};

const Command = ({
  isSelected,
  name,
  script,
  isFavorite = false,
  isPinned = false,
  showMarker = false,
  packageName,
  isRootPackage = false,
  isCurrentPackage = false,
  isHidden = false,
  hasDetails = false,
  needsConfirm = false,
  isLastRun = false,
}: CommandProps) => {
  const cursor = isSelected ? "▸ " : "  ";
  const nameColor = isSelected ? "greenBright" : "green";
  const scriptColor = isSelected ? "blueBright" : "blue";
  const { symbol, color } = marker(isPinned, isFavorite);
  return (
    <Box width="100%" height={1} flexShrink={0}>
      <Text wrap="truncate-end">
        <Text color="green">{cursor}</Text>
        {showMarker && <Text color={color}>{symbol} </Text>}
        {packageName !== undefined && (
          <Text color="magenta" dimColor={isHidden}>
            {toDisplayText(packageName)}
            {isRootPackage && <Text bold> [root]</Text>}
            {isCurrentPackage && <Text bold> [current]</Text>}
            {" › "}
          </Text>
        )}
        <Text bold={isSelected} color={nameColor} dimColor={isHidden}>
          {toDisplayText(name)}
        </Text>
        {isLastRun && <Text dimColor>&nbsp;{LAST_RUN}&nbsp;</Text>}
        {needsConfirm && (
          <Text color="red" dimColor={isHidden}>
            &nbsp;{CONFIRM}&nbsp;
          </Text>
        )}
        {hasDetails && (
          <Text color="cyan" dimColor={isHidden}>
            &nbsp;{DETAILS}&nbsp;
          </Text>
        )}
        <Text dimColor={isHidden}>&nbsp;:&nbsp;</Text>
        <Text bold={isSelected} color={scriptColor} dimColor={isHidden}>
          {toDisplayText(script).replace(/\s+/g, " ")}
        </Text>
      </Text>
    </Box>
  );
};
export default Command;
