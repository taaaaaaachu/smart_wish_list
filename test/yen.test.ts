import { describe, expect, it } from "vitest";
import { parseYen, yenInputHandler } from "../src/lib/yen";

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

describe("yenInputHandler", () => {
  // 属性に埋め込む文字列を実際に関数化して、入力欄の値の書き換えを確かめる
  const run = (value: string, isComposing = false) => {
    const input = { value };
    new Function("event", yenInputHandler).call(input, { isComposing });
    return input.value;
  };

  it("全角数字・¥・カンマを半角数字だけにする", () => {
    expect(run("￥１，９８０円")).toBe("1980");
    expect(run("¥1,980")).toBe("1980");
  });

  it("IME変換中は書き換えない", () => {
    expect(run("１９", true)).toBe("１９");
  });

  it("parseYen が拒否する文字は残してサーバーでエラーにさせる", () => {
    expect(run("1980ドル")).toBe("1980ドル");
  });
});
