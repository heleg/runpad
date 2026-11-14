import { useState } from "react";

const useScrollOffset = (
  selectedIndex: number,
  itemCount: number,
  visibleRows: number,
) => {
  const [offset, setOffset] = useState(0);
  const margin = Math.min(2, Math.floor((visibleRows - 1) / 2));
  const maxOffset = Math.max(0, itemCount - visibleRows);
  const minOffset = Math.max(0, selectedIndex - visibleRows + margin + 1);
  const upperOffset = Math.max(0, selectedIndex - margin);
  const nextOffset = Math.min(
    maxOffset,
    Math.max(minOffset, Math.min(offset, upperOffset)),
  );

  if (nextOffset !== offset) {
    setOffset(nextOffset);
  }

  return nextOffset;
};

export default useScrollOffset;
