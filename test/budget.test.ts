import { describe, expect, it } from "vitest";
import type { Item } from "../src/db";
import { selectItemsWithinBudget } from "../src/lib/budget";

function makeItem(
  overrides: Pick<Item, "id" | "price" | "wantLevel" | "usageFreq">,
): Item {
  return {
    title: `item-${overrides.id}`,
    url: null,
    purchased: false,
    purchasedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("selectItemsWithinBudget", () => {
  it("予算内に収まる単一の高コスパ品を選ぶ", () => {
    const items = [
      makeItem({ id: 1, price: 5000, wantLevel: 10, usageFreq: 10 }),
    ];
    const result = selectItemsWithinBudget(items, 10000);
    expect(result.selected.map((i) => i.id)).toEqual([1]);
    expect(result.totalPrice).toBe(5000);
    expect(result.remaining).toBe(5000);
  });

  it("優先度が高い商品だけでは予算が余る場合、安い商品を追加して予算を使い切る", () => {
    const a = makeItem({ id: 1, price: 9000, wantLevel: 10, usageFreq: 10 });
    const b = makeItem({ id: 2, price: 1000, wantLevel: 1, usageFreq: 1 });
    const result = selectItemsWithinBudget([a, b], 10000);
    const ids = result.selected.map((i) => i.id).sort();
    expect(ids).toEqual([1, 2]);
    expect(result.totalPrice).toBe(10000);
    expect(result.remaining).toBe(0);
  });

  it("低コスパの組み合わせより高コスパ単独アイテムを優先する", () => {
    const x = makeItem({ id: 1, price: 10000, wantLevel: 10, usageFreq: 10 });
    const y1 = makeItem({ id: 2, price: 9000, wantLevel: 1, usageFreq: 1 });
    const y2 = makeItem({ id: 3, price: 1000, wantLevel: 1, usageFreq: 1 });
    const result = selectItemsWithinBudget([x, y1, y2], 10000);
    expect(result.selected.map((i) => i.id)).toEqual([1]);
    expect(result.totalPrice).toBe(10000);
  });

  it("どのアイテムも予算に収まらない場合は空になる", () => {
    const items = [
      makeItem({ id: 1, price: 20000, wantLevel: 10, usageFreq: 10 }),
    ];
    const result = selectItemsWithinBudget(items, 10000);
    expect(result.selected).toEqual([]);
    expect(result.totalPrice).toBe(0);
    expect(result.remaining).toBe(10000);
  });

  it("予算が0の場合は何も選ばれない", () => {
    const items = [makeItem({ id: 1, price: 100, wantLevel: 5, usageFreq: 5 })];
    const result = selectItemsWithinBudget(items, 0);
    expect(result.selected).toEqual([]);
  });

  it("選ばれたアイテムの合計金額は予算を超えない(大きな予算でバケット近似が働く場合も含む)", () => {
    const items = Array.from({ length: 50 }, (_, i) =>
      makeItem({
        id: i + 1,
        price: (i + 1) * 1237,
        wantLevel: (i % 10) + 1,
        usageFreq: ((i * 3) % 10) + 1,
      }),
    );
    const budget = 1_000_000;
    const result = selectItemsWithinBudget(items, budget);
    expect(result.totalPrice).toBeLessThanOrEqual(budget);
    const actualTotal = result.selected.reduce((sum, i) => sum + i.price, 0);
    expect(actualTotal).toBe(result.totalPrice);
  });
});
