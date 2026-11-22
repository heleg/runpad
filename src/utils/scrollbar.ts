/**
 * Where the scrollbar thumb sits in a track of `height` cells, for a view
 * of `height` lines at `offset` into `total` lines. The thumb is as tall
 * as the visible share of the text, at least one cell, and touches the
 * ends of the track exactly at the top and at the bottom.
 */
const scrollbarThumb = (
  offset: number,
  height: number,
  total: number,
): { start: number; size: number } => {
  if (total <= height) {
    return { start: 0, size: height };
  }
  const size = Math.max(
    1,
    Math.min(height - 1, Math.round((height * height) / total)),
  );
  const maxOffset = total - height;
  const room = height - size;
  const at = Math.max(0, Math.min(offset, maxOffset));
  if (at === 0 || at === maxOffset) {
    return { start: at === 0 ? 0 : room, size };
  }
  // In between, the thumb stays off the ends, so reaching an end shows.
  const start = Math.round((at / maxOffset) * room);
  return {
    start: room < 2 ? start : Math.max(1, Math.min(room - 1, start)),
    size,
  };
};

export default scrollbarThumb;
