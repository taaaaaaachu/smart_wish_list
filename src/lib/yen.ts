// 金額表記から捨てる文字(区切り・通貨記号・空白。\ は日本語キーボードの円記号)。
// サーバー側の parseYen と入力欄の整形で同じ定義を使う。
const YEN_NOISE = /[,¥\\円\s]/g;

// 「¥1,980」「１９８０円」「1 980」のような金額表記を数値にする。
// 全角はNFKCで半角へ寄せる。数字が残らなければ NaN を返し、呼び出し側の整数チェックで弾く。
export function parseYen(raw: string): number {
  const s = raw.normalize("NFKC").replace(YEN_NOISE, "");
  return s === "" ? NaN : Number(s);
}

// 入力欄の oninput / oncompositionend に入れる整形処理。IME変換中は触らない。
// 値が変わるときだけ代入し、カーソルが末尾へ飛ぶのを最小限にする。
export const yenInputHandler = `if(!event.isComposing){var v=this.value.normalize('NFKC').replace(/${YEN_NOISE.source}/g,'');if(v!==this.value)this.value=v}`;
