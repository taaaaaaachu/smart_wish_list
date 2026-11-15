import { describe, expect, it } from "vitest";
import { parseYen } from "../src/lib/yen";

describe("parseYen", () => {
  it.each([
    ["1980", 1980],
    ["1,980", 1980],
    ["¥1,980", 1980],
    ["￥１，９８０", 1980],
    ["1980円", 1980],
    ["\\1,980", 1980],
    [" 12 800 ", 12800],
  ])("%s → %d", (raw, expected) => {
    expect(parseYen(raw)).toBe(expected);
  });

  it.each(["", "¥", "円", "abc", "1,980ドル"])("%s は NaN", (raw) => {
    expect(parseYen(raw)).toBeNaN();
  });
});
