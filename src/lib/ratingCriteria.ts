export type RatingCriterion = { level: string; description: string };

export const WANT_LEVEL_CRITERIA: RatingCriterion[] = [
  { level: "10", description: "生活・精神的に不可欠。長年欲しかった。迷いなし" },
  { level: "9", description: "かなり欲しい。具体的な用途・場面がすぐ思い浮かぶ" },
  { level: "8", description: "日常で頻繁に使用でき、高い満足度が期待できる" },
  { level: "7", description: "気分が上がる・便利。強い理由はないがワクワクする" },
  { level: "6", description: "少し気になる。あれば便利かも" },
  { level: "5", description: "中立。興味はあるが、特に理由はない" },
  { level: "4", description: "他人の所有に影響されて欲しいと感じている" },
  { level: "3", description: "衝動的。一時的な気まぐれやストレス発散の可能性" },
  { level: "2", description: "購入時の満足感は一瞬のみ。飽きやすい" },
  { level: "1", description: "実は欲しくない。候補にしたが未練なし" },
];

export const USAGE_FREQ_CRITERIA: RatingCriterion[] = [
  { level: "1", description: "一度だけ(結婚式のアイテムなど)" },
  { level: "2〜3", description: "年に数回使用" },
  { level: "5", description: "月1回使用" },
  { level: "7", description: "週1回使用" },
  { level: "9", description: "毎日使用" },
  { level: "10", description: "毎日複数回使用" },
];
