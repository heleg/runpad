import { describe, expect, test } from "bun:test";

import scrollbarThumb from "./scrollbar";

describe("scrollbarThumb", () => {
  test("is as tall as the visible share", () => {
    expect(scrollbarThumb(0, 10, 40).size).toBe(3);
  });

  test("touches the top at the start and the bottom at the end", () => {
    expect(scrollbarThumb(0, 10, 40)).toEqual({ start: 0, size: 3 });
    expect(scrollbarThumb(30, 10, 40)).toEqual({ start: 7, size: 3 });
  });

  test("leaves the ends once scrolled away from them", () => {
    expect(scrollbarThumb(1, 10, 40).start).toBe(1);
    expect(scrollbarThumb(29, 10, 40).start).toBe(6);
    expect(scrollbarThumb(15, 10, 40).start).toBe(4);
  });

  test("keeps at least one cell for very long text", () => {
    expect(scrollbarThumb(0, 5, 1000).size).toBe(1);
  });

  test("never fills the whole track while there is more text", () => {
    expect(scrollbarThumb(0, 10, 11).size).toBe(9);
  });

  test("fills the track when everything fits", () => {
    expect(scrollbarThumb(0, 10, 5)).toEqual({ start: 0, size: 10 });
  });
});
