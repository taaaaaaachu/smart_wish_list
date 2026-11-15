// 「¥1,980」「１９８０円」「1 980」のような金額表記を数値にする。
// 全角はNFKCで半角へ寄せ、区切り・通貨記号・空白を捨てる(\ は日本語キーボードの円記号)。
// 数字が残らなければ NaN を返し、呼び出し側の整数チェックで弾く。
export function parseYen(raw: string): number {
  const s = raw.normalize("NFKC").replace(/[,¥\\円\s]/g, "");
  return s === "" ? NaN : Number(s);
}
