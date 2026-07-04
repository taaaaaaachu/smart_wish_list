import { describe, expect, it } from "vitest";
import { calcPriority } from "../src/lib/priority";

describe("calcPriority", () => {
  it("値段を欲しい度×使用頻度で割った値を返す", () => {
    expect(calcPriority(10000, 2, 2)).toBe(2500);
  });

  it("欲しい度・使用頻度が高いほど優先度の数値は小さくなる(コスパが良い)", () => {
    const low = calcPriority(10000, 10, 10);
    const high = calcPriority(10000, 2, 2);
    expect(low).toBeLessThan(high);
  });

  it("欲しい度・使用頻度が最大(10,10)の境界値を計算できる", () => {
    expect(calcPriority(10000, 10, 10)).toBe(100);
  });

  it("欲しい度・使用頻度が最小(1,1)の境界値を計算できる", () => {
    expect(calcPriority(10000, 1, 1)).toBe(10000);
  });
});
