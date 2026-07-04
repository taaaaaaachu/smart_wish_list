import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "../src/index";
import { listItems } from "../src/db";

function form(data: Record<string, string>) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(data).toString(),
  };
}

async function createTestItem(title: string) {
  const res = await app.request(
    "/items",
    form({
      title,
      url: "",
      price: "10000",
      wantLevel: "8",
      usageFreq: "7",
    }),
    env,
  );
  expect(res.status).toBe(302);
  const items = await listItems(env.DB, false);
  const created = items.find((i) => i.title === title);
  if (!created) throw new Error("作成したアイテムが見つかりません");
  return created;
}

describe("items routes", () => {
  it("GET /items/new はフォームを表示する", async () => {
    const res = await app.request("/items/new", {}, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("アイテムを追加");
  });

  it("POST /items で作成した後、一覧に表示される", async () => {
    await createTestItem("一覧テスト商品");
    const res = await app.request("/", {}, env);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("一覧テスト商品");
    expect(body).toContain("10,000円");
  });

  it("POST /items にタイトル未入力で送るとエラーを表示する(400)", async () => {
    const res = await app.request(
      "/items",
      form({ title: "", url: "", price: "100", wantLevel: "1", usageFreq: "1" }),
      env,
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("タイトルを入力してください");
  });

  it("GET /items/:id/edit で既存の値がフォームに入る", async () => {
    const created = await createTestItem("編集対象商品");
    const res = await app.request(`/items/${created.id}/edit`, {}, env);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("編集対象商品");
    expect(body).toContain("10000");
  });

  it("GET /items/:id/edit は存在しないIDで404を返す", async () => {
    const res = await app.request("/items/999999/edit", {}, env);
    expect(res.status).toBe(404);
  });

  it("POST /items/:id で更新すると一覧に反映される", async () => {
    const created = await createTestItem("更新前商品");
    const res = await app.request(
      `/items/${created.id}`,
      form({
        title: "更新後商品",
        url: "",
        price: "20000",
        wantLevel: "9",
        usageFreq: "9",
      }),
      env,
    );
    expect(res.status).toBe(302);

    const listRes = await app.request("/", {}, env);
    const body = await listRes.text();
    expect(body).toContain("更新後商品");
    expect(body).not.toContain("更新前商品");
  });

  it("POST /items/:id/delete で削除すると一覧から消える", async () => {
    const created = await createTestItem("削除対象商品");
    const res = await app.request(`/items/${created.id}/delete`, {
      method: "POST",
    }, env);
    expect(res.status).toBe(302);

    const listRes = await app.request("/", {}, env);
    const body = await listRes.text();
    expect(body).not.toContain("削除対象商品");
  });
});
