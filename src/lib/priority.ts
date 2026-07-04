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
