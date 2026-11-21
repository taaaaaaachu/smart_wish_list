import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "../src/index";
import { createItem, listItems } from "../src/db";
import { issueMcpToken } from "../src/lib/mcpToken";

const MCP_URL = "http://localhost/mcp";

async function connect(token: string) {
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(MCP_URL), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
      fetch: async (url, init) => app.request(String(url), init, env),
    }),
  );
  return client;
}

function parse(result: Awaited<ReturnType<Client["callTool"]>>) {
  const [first] = result.content as { type: string; text: string }[];
  return JSON.parse(first.text);
}

const item = { title: "ヘッドホン", price: 20000, wantLevel: 8, usageFreq: 9 };

describe("/mcp", () => {
  it("トークンなし・不正なトークンは401", async () => {
    const init = { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } };
    expect((await app.request("/mcp", init, env)).status).toBe(401);
    const bad = { ...init, headers: { ...init.headers, Authorization: "Bearer swl_bad" } };
    const res = await app.request("/mcp", bad, env);
    expect(res.status).toBe(401);
    expect(res.headers.get("WWW-Authenticate")).toContain("Bearer");
  });

  it("ツール一覧を返す", async () => {
    const client = await connect(await issueMcpToken(env.DB, "a@example.com"));
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "add_item",
      "delete_item",
      "list_items",
      "set_purchased",
      "suggest_within_budget",
      "update_item",
    ]);
  });

  it("追加・一覧・更新・購入・削除ができ、トークンの持ち主のデータだけを触る", async () => {
    await createItem(env.DB, "b@example.com", { ...item, title: "他人の物", url: null });
    const client = await connect(await issueMcpToken(env.DB, "a@example.com"));

    const added = parse(await client.callTool({ name: "add_item", arguments: item }));
    expect(added).toMatchObject({ ...item, url: null });
    expect(await listItems(env.DB, "a@example.com", false)).toHaveLength(1);

    const listed = parse(await client.callTool({ name: "list_items", arguments: {} }));
    expect(listed.map((i: { title: string }) => i.title)).toEqual(["ヘッドホン"]);

    const updated = parse(
      await client.callTool({
        name: "update_item",
        arguments: { id: added.id, ...item, price: 15000, url: "https://example.com" },
      }),
    );
    expect(updated).toMatchObject({ price: 15000, url: "https://example.com" });

    await client.callTool({ name: "set_purchased", arguments: { id: added.id } });
    const bought = parse(
      await client.callTool({ name: "list_items", arguments: { purchased: true } }),
    );
    expect(bought).toHaveLength(1);

    await client.callTool({ name: "delete_item", arguments: { id: added.id } });
    expect(await listItems(env.DB, "a@example.com", true)).toHaveLength(0);
    expect(await listItems(env.DB, "b@example.com", false)).toHaveLength(1);
  });

  it("他人のアイテムは更新できずエラーになる", async () => {
    const other = await createItem(env.DB, "b@example.com", { ...item, url: null });
    const client = await connect(await issueMcpToken(env.DB, "a@example.com"));
    const result = await client.callTool({
      name: "update_item",
      arguments: { id: other.id, ...item, price: 1 },
    });
    expect(result.isError).toBe(true);
    expect((await listItems(env.DB, "b@example.com", false))[0].price).toBe(20000);
  });

  it("範囲外の値は拒否する", async () => {
    const client = await connect(await issueMcpToken(env.DB, "a@example.com"));
    const result = await client.callTool({
      name: "add_item",
      arguments: { ...item, wantLevel: 11 },
    });
    expect(result.isError).toBe(true);
    expect(await listItems(env.DB, "a@example.com", false)).toHaveLength(0);
  });

  it("suggest_within_budget は予算内の組み合わせを返す", async () => {
    await createItem(env.DB, "a@example.com", { ...item, url: null });
    await createItem(env.DB, "a@example.com", { ...item, title: "本", price: 3000, url: null });
    const client = await connect(await issueMcpToken(env.DB, "a@example.com"));
    const result = parse(
      await client.callTool({ name: "suggest_within_budget", arguments: { budget: 5000 } }),
    );
    expect(result.selected.map((i: { title: string }) => i.title)).toEqual(["本"]);
    expect(result.remaining).toBe(2000);
  });
});
