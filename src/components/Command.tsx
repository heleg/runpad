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
  /** Hidden by config, shown only on request: drawn dimmed. */
  isHidden?: boolean;
}

// Pinned and favorite share one column, so ⚑ and ★ line up. A script that is
// both shows ⚑ in the favorite color. Some fonts draw ⚑ wider than its
// cell, so the marker is followed by a space.
const PIN = "⚑";
const STAR = "★";
const PINNED_COLOR = "cyan";
const FAVORITE_COLOR = "yellow";

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
  isHidden = false,
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
            {" › "}
          </Text>
        )}
        <Text bold={isSelected} color={nameColor} dimColor={isHidden}>
          {toDisplayText(name)}
        </Text>
        <Text dimColor={isHidden}>&nbsp;:&nbsp;</Text>
        <Text bold={isSelected} color={scriptColor} dimColor={isHidden}>
          {toDisplayText(script).replace(/\s+/g, " ")}
        </Text>
      </Text>
    </Box>
  );
};
export default Command;
