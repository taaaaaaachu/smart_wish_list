import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import {
  createItem,
  deleteItem,
  getItem,
  listItems,
  setPurchased,
  updateItem,
} from "../src/db";

describe("db", () => {
  it("creates and fetches an item", async () => {
    const created = await createItem(env.DB, {
      title: "テストアイテム",
      url: "https://example.com",
      price: 10000,
      wantLevel: 8,
      usageFreq: 7,
    });
    expect(created.id).toBeGreaterThan(0);
    expect(created.purchased).toBe(false);

    const fetched = await getItem(env.DB, created.id);
    expect(fetched).toMatchObject({ title: "テストアイテム", price: 10000 });
  });

  it("lists only unpurchased items by default and excludes purchased ones", async () => {
    const a = await createItem(env.DB, {
      title: "A",
      url: null,
      price: 1000,
      wantLevel: 5,
      usageFreq: 5,
    });
    const b = await createItem(env.DB, {
      title: "B",
      url: null,
      price: 2000,
      wantLevel: 5,
      usageFreq: 5,
    });
    await setPurchased(env.DB, b.id, true);

    const unpurchased = await listItems(env.DB, false);
    const purchased = await listItems(env.DB, true);

    expect(unpurchased.some((i) => i.id === a.id)).toBe(true);
    expect(unpurchased.some((i) => i.id === b.id)).toBe(false);
    expect(purchased.some((i) => i.id === b.id)).toBe(true);
  });

  it("updates an item", async () => {
    const item = await createItem(env.DB, {
      title: "元",
      url: null,
      price: 500,
      wantLevel: 3,
      usageFreq: 3,
    });
    const updated = await updateItem(env.DB, item.id, {
      title: "変更後",
      url: null,
      price: 999,
      wantLevel: 9,
      usageFreq: 9,
    });
    expect(updated).toMatchObject({
      title: "変更後",
      price: 999,
      wantLevel: 9,
      usageFreq: 9,
    });
  });

  it("returns null when updating a missing item", async () => {
    const result = await updateItem(env.DB, 999999, {
      title: "x",
      url: null,
      price: 1,
      wantLevel: 1,
      usageFreq: 1,
    });
    expect(result).toBeNull();
  });

  it("deletes an item", async () => {
    const item = await createItem(env.DB, {
      title: "削除対象",
      url: null,
      price: 100,
      wantLevel: 1,
      usageFreq: 1,
    });
    await deleteItem(env.DB, item.id);
    const fetched = await getItem(env.DB, item.id);
    expect(fetched).toBeNull();
  });

  it("marks purchased and unmarks purchased", async () => {
    const item = await createItem(env.DB, {
      title: "購入テスト",
      url: null,
      price: 100,
      wantLevel: 5,
      usageFreq: 5,
    });
    const purchased = await setPurchased(env.DB, item.id, true);
    expect(purchased?.purchased).toBe(true);
    expect(purchased?.purchasedAt).not.toBeNull();

    const unpurchased = await setPurchased(env.DB, item.id, false);
    expect(unpurchased?.purchased).toBe(false);
    expect(unpurchased?.purchasedAt).toBeNull();
  });
});
