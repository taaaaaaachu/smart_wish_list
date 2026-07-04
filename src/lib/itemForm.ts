import type { ItemInput } from "../db";
import type { ItemFormValues } from "../components/ItemForm";

export type ParseItemFormResult =
  | { ok: true; input: ItemInput }
  | { ok: false; error: string; values: ItemFormValues };

export function parseItemForm(raw: Record<string, unknown>): ParseItemFormResult {
  const toStr = (v: unknown) => (typeof v === "string" ? v : "");
  const values: ItemFormValues = {
    title: toStr(raw.title),
    url: toStr(raw.url),
    price: toStr(raw.price),
    wantLevel: toStr(raw.wantLevel),
    usageFreq: toStr(raw.usageFreq),
  };

  const title = values.title?.trim() ?? "";
  const url = values.url?.trim() || null;
  const price = Number(values.price);
  const wantLevel = Number(values.wantLevel);
  const usageFreq = Number(values.usageFreq);

  if (!title) {
    return { ok: false, error: "タイトルを入力してください。", values };
  }
  if (!Number.isInteger(price) || price <= 0) {
    return { ok: false, error: "値段は1以上の整数で入力してください。", values };
  }
  if (!Number.isInteger(wantLevel) || wantLevel < 1 || wantLevel > 10) {
    return { ok: false, error: "欲しい度は1〜10の整数で入力してください。", values };
  }
  if (!Number.isInteger(usageFreq) || usageFreq < 1 || usageFreq > 10) {
    return { ok: false, error: "使用頻度は1〜10の整数で入力してください。", values };
  }

  return { ok: true, input: { title, url, price, wantLevel, usageFreq } };
}
