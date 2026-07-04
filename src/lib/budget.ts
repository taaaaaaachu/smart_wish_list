import type { Item } from "../db";

export type BudgetResult = {
  selected: Item[];
  totalPrice: number;
  remaining: number;
};

// DPのcapacity次元をこの値以下に抑えるよう、価格をバケット単位に丸めて
// 予算が大きい場合でも計算量(アイテム数 × capacity)を一定に保つ。
const MAX_DP_CAPACITY = 20000;

function knapsack(
  weights: number[],
  values: number[],
  capacity: number,
): { selectedIndices: number[] } {
  const n = weights.length;
  const cols = capacity + 1;
  const dp = new Float64Array((n + 1) * cols);

  for (let k = 1; k <= n; k++) {
    const w = weights[k - 1];
    const v = values[k - 1];
    const prevRow = (k - 1) * cols;
    const curRow = k * cols;
    for (let c = 0; c < cols; c++) {
      let best = dp[prevRow + c];
      if (c >= w) {
        const candidate = dp[prevRow + (c - w)] + v;
        if (candidate > best) best = candidate;
      }
      dp[curRow + c] = best;
    }
  }

  const selectedIndices: number[] = [];
  let c = capacity;
  for (let k = n; k >= 1; k--) {
    const curRow = k * cols;
    const prevRow = (k - 1) * cols;
    if (dp[curRow + c] !== dp[prevRow + c]) {
      selectedIndices.push(k - 1);
      c -= weights[k - 1];
    }
  }
  selectedIndices.reverse();

  return { selectedIndices };
}

/**
 * 予算内で「コスパ(欲しい度×使用頻度/値段)の合計」を最大化する
 * アイテムの組み合わせを0/1ナップサックで求める。
 * 価値が常に正であるため、予算に余裕があれば安いアイテムを追加した方が
 * 目的関数が大きくなる → 自然と「予算を使い切る」動きになる。
 */
export function selectItemsWithinBudget(
  items: Item[],
  budget: number,
): BudgetResult {
  const affordable = items.filter((item) => item.price <= budget);
  if (affordable.length === 0) {
    return { selected: [], totalPrice: 0, remaining: budget };
  }

  const bucketSize = Math.max(1, Math.ceil(budget / MAX_DP_CAPACITY));
  const capacity = Math.floor(budget / bucketSize);

  const weights = affordable.map((item) =>
    Math.min(capacity, Math.ceil(item.price / bucketSize)),
  );
  const values = affordable.map(
    (item) => (item.wantLevel * item.usageFreq) / item.price,
  );

  const { selectedIndices } = knapsack(weights, values, capacity);
  const selected = selectedIndices.map((idx) => affordable[idx]);
  const totalPrice = selected.reduce((sum, item) => sum + item.price, 0);

  return { selected, totalPrice, remaining: budget - totalPrice };
}
