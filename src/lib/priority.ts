import type { Item } from "../db";

/**
 * 優先度 = 値段 / (欲しい度 × 使用頻度)。数値が小さいほどコスパが良い。
 */
export function calcPriority(
  price: number,
  wantLevel: number,
  usageFreq: number,
): number {
  return price / (wantLevel * usageFreq);
}

/** 優先度の高い(数値が小さい)順に並べた新しい配列を返す。 */
export function sortByPriority(items: Item[]): Item[] {
  return [...items].sort(
    (a, b) =>
      calcPriority(a.price, a.wantLevel, a.usageFreq) -
      calcPriority(b.price, b.wantLevel, b.usageFreq),
  );
}
