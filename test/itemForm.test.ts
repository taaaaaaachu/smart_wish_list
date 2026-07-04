import { describe, expect, it } from "vitest";
import { parseItemForm } from "../src/lib/itemForm";

describe("parseItemForm", () => {
  it("正しい入力をItemInputに変換する", () => {
    const result = parseItemForm({
      title: "  テスト  ",
      url: "https://example.com",
      price: "10000",
      wantLevel: "8",
      usageFreq: "7",
    });
    expect(result).toEqual({
      ok: true,
      input: {
        title: "テスト",
        url: "https://example.com",
        price: 10000,
        wantLevel: 8,
        usageFreq: 7,
      },
    });
  });

  it("urlが空文字の場合はnullになる", () => {
    const result = parseItemForm({
      title: "テスト",
      url: "",
      price: "100",
      wantLevel: "1",
      usageFreq: "1",
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.input.url).toBeNull();
  });

  it("タイトルが空の場合はエラーになる", () => {
    const result = parseItemForm({
      title: "   ",
      price: "100",
      wantLevel: "1",
      usageFreq: "1",
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/タイトル/);
  });

  it("値段が0以下の場合はエラーになる", () => {
    const result = parseItemForm({
      title: "テスト",
      price: "0",
      wantLevel: "1",
      usageFreq: "1",
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/値段/);
  });

  it("欲しい度が範囲外(11)の場合はエラーになる", () => {
    const result = parseItemForm({
      title: "テスト",
      price: "100",
      wantLevel: "11",
      usageFreq: "1",
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/欲しい度/);
  });

  it("使用頻度が範囲外(0)の場合はエラーになる", () => {
    const result = parseItemForm({
      title: "テスト",
      price: "100",
      wantLevel: "1",
      usageFreq: "0",
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/使用頻度/);
  });

  it("数値でない入力はエラーになる", () => {
    const result = parseItemForm({
      title: "テスト",
      price: "abc",
      wantLevel: "1",
      usageFreq: "1",
    });
    expect(result.ok).toBe(false);
  });
});
