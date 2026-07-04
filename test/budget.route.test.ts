import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "../src/index";

function form(data: Record<string, string>) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(data).toString(),
  };
}

async function createTestItem(overrides: {
  title: string;
  price: string;
  wantLevel: string;
  usageFreq: string;
}) {
  const res = await app.request(
    "/items",
    form({ url: "", ...overrides }),
    env,
  );
  expect(res.status).toBe(302);
}

describe("budget route", () => {
  it("GET /budget は予算入力フォームを表示する", async () => {
    const res = await app.request("/budget", {}, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("予算内で買うものを選ぶ");
  });

  it("POST /budget で予算内に収まるアイテムが候補として表示される", async () => {
    await createTestItem({
      title: "予算テスト高コスパ品",
      price: "5000",
      wantLevel: "10",
      usageFreq: "10",
    });
    await createTestItem({
      title: "予算テスト高額品",
      price: "50000",
      wantLevel: "10",
      usageFreq: "10",
    });

    const res = await app.request("/budget", form({ budget: "10000" }), env);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("予算テスト高コスパ品");
    expect(body).toContain("選ばれなかったアイテム");
    expect(body).toContain("予算テスト高額品");
  });

  it("負の予算はエラーになる(400)", async () => {
    const res = await app.request("/budget", form({ budget: "-1" }), env);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("0以上の整数");
  });

  it("数値でない予算はエラーになる(400)", async () => {
    const res = await app.request("/budget", form({ budget: "abc" }), env);
    expect(res.status).toBe(400);
  });
});
