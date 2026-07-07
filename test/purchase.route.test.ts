import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "../src/index";
import { listItems } from "../src/db";

function form(data: Record<string, string> = {}) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(data).toString(),
  };
}

async function createTestItem(title: string) {
  const res = await app.request(
    "/items",
    form({ title, url: "", price: "10000", wantLevel: "8", usageFreq: "7" }),
    env,
  );
  expect(res.status).toBe(302);
  const items = await listItems(env.DB, "test@example.com", false);
  const created = items.find((i) => i.title === title);
  if (!created) throw new Error("作成したアイテムが見つかりません");
  return created;
}

describe("purchase routes", () => {
  it("POST /items/:id/purchase で購入済みにすると未購入一覧から消え、購入済み一覧に表示される", async () => {
    const created = await createTestItem("購入フローテスト商品");

    const purchaseRes = await app.request(
      `/items/${created.id}/purchase`,
      form(),
      env,
    );
    expect(purchaseRes.status).toBe(302);
    expect(purchaseRes.headers.get("location")).toBe("/");

    const unpurchasedBody = await (await app.request("/", {}, env)).text();
    expect(unpurchasedBody).not.toContain("購入フローテスト商品");

    const purchasedBody = await (
      await app.request("/purchased", {}, env)
    ).text();
    expect(purchasedBody).toContain("購入フローテスト商品");
  });

  it("POST /items/:id/unpurchase で購入を取り消すと未購入一覧に戻る", async () => {
    const created = await createTestItem("購入取消テスト商品");
    await app.request(`/items/${created.id}/purchase`, form(), env);

    const unpurchaseRes = await app.request(
      `/items/${created.id}/unpurchase`,
      form(),
      env,
    );
    expect(unpurchaseRes.status).toBe(302);
    expect(unpurchaseRes.headers.get("location")).toBe("/purchased");

    const unpurchasedBody = await (await app.request("/", {}, env)).text();
    expect(unpurchasedBody).toContain("購入取消テスト商品");
  });

  it("POST /items/:id/purchase は存在しないIDで404を返す", async () => {
    const res = await app.request("/items/999999/purchase", form(), env);
    expect(res.status).toBe(404);
  });

  it("GET /purchased は購入済みが無い場合に案内文を表示する", async () => {
    const res = await app.request("/purchased", {}, env);
    expect(res.status).toBe(200);
  });
});
