import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createScheduledController, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker, { app } from "../src/index";
import { createItem, listItems } from "../src/db";
import {
  createOAuthConnection,
  issueManualConnection,
  listAgentConnections,
} from "../src/lib/agentConnections";
import { issueAuthorizationCode } from "../src/lib/oauth";

const ORIGIN = "http://example.com";

/** 本物のMCPクライアントで、Bearerトークンを付けてアプリの /mcp へ繋ぐ */
async function connect(token: string) {
  const client = new Client({ name: "test", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${ORIGIN}/mcp`), {
      fetch: async (input, init) => {
        const req = new Request(input, init);
        req.headers.set("Authorization", `Bearer ${token}`);
        return app.request(req, undefined, env);
      },
    }),
  );
  return {
    tools: async () => (await client.listTools()).tools,
    call: async (name: string, args: Record<string, unknown> = {}) => {
      const r = await client.callTool({ name, arguments: args });
      const text = (r.content as { type: string; text: string }[])[0].text;
      return { isError: r.isError === true, text, data: r.isError ? null : JSON.parse(text) };
    },
  };
}

async function tokenFor(email: string): Promise<string> {
  return (await issueManualConnection(env.DB, email, "test")).token;
}

const item = { title: "ヘッドホン", price: 20000, wantLevel: 8, usageFreq: 9 };

describe("認証", () => {
  it("トークンが無い・不正なら401で認可サーバーの在処を知らせる", async () => {
    for (const headers of [{}, { Authorization: "Bearer swl_wrong" }] as Record<string, string>[]) {
      const res = await app.request(
        `${ORIGIN}/mcp`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
        },
        env,
      );
      expect(res.status).toBe(401);
      expect(res.headers.get("WWW-Authenticate")).toBe(
        `Bearer resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource/mcp"`,
      );
    }
  });

  it("OAuth のアクセストークンでも使える", async () => {
    const { accessToken } = await createOAuthConnection(env.DB, "oauth-mcp@example.com", "https://agent.example/c.json", "muse");
    const mcp = await connect(accessToken);
    expect((await mcp.call("list_items")).isError).toBe(false);
  });
});

describe("ツール", () => {
  it("ツール一覧を返す", async () => {
    const mcp = await connect(await tokenFor("tools@example.com"));
    expect((await mcp.tools()).map((t) => t.name).sort()).toEqual([
      "add_item",
      "delete_item",
      "list_items",
      "set_purchased",
      "suggest_within_budget",
      "update_item",
    ]);
  });

  it("追加・一覧・更新・購入・削除ができ、トークンの持ち主のデータだけを触る", async () => {
    await createItem(env.DB, "other@example.com", { ...item, title: "他人の物", url: null });
    const mcp = await connect(await tokenFor("crud@example.com"));

    const added = (await mcp.call("add_item", item)).data;
    expect(added).toMatchObject({ ...item, url: null });

    const listed = (await mcp.call("list_items")).data;
    expect(listed.items.map((i: { title: string }) => i.title)).toEqual(["ヘッドホン"]);

    const updated = (await mcp.call("update_item", { id: added.id, ...item, price: 15000, url: "https://example.com" })).data;
    expect(updated).toMatchObject({ price: 15000, url: "https://example.com" });

    await mcp.call("set_purchased", { id: added.id });
    expect((await mcp.call("list_items", { purchased: true })).data.items).toHaveLength(1);

    await mcp.call("delete_item", { id: added.id });
    expect(await listItems(env.DB, "crud@example.com", true)).toHaveLength(0);
    expect(await listItems(env.DB, "other@example.com", false)).toHaveLength(1);
  });

  it("他人のアイテムは更新できずエラーになる", async () => {
    const other = await createItem(env.DB, "victim@example.com", { ...item, url: null });
    const mcp = await connect(await tokenFor("attacker@example.com"));
    expect((await mcp.call("update_item", { id: other.id, ...item, price: 1 })).isError).toBe(true);
    expect((await listItems(env.DB, "victim@example.com", false))[0].price).toBe(20000);
  });

  it("範囲外の値は拒否する", async () => {
    const mcp = await connect(await tokenFor("range@example.com"));
    expect((await mcp.call("add_item", { ...item, wantLevel: 11 })).isError).toBe(true);
    expect(await listItems(env.DB, "range@example.com", false)).toHaveLength(0);
  });

  it("suggest_within_budget は予算内の組み合わせを返す", async () => {
    await createItem(env.DB, "budget@example.com", { ...item, url: null });
    await createItem(env.DB, "budget@example.com", { ...item, title: "本", price: 3000, url: null });
    const mcp = await connect(await tokenFor("budget@example.com"));
    const result = (await mcp.call("suggest_within_budget", { budget: 5000 })).data;
    expect(result.selected.map((i: { title: string }) => i.title)).toEqual(["本"]);
    expect(result.remaining).toBe(2000);
  });
});

describe("設定画面", () => {
  it("名前を付けてトークンを発行すると一度だけ表示し、一覧に出る", async () => {
    const res = await app.request(
      "/settings/mcp/connections",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ name: "Muse" }).toString(),
      },
      env,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const token = (await res.text()).match(/swl_[A-Za-z0-9_-]{43}/)?.[0];
    expect(token).toBeDefined();

    const page = await (await app.request("/settings/mcp", {}, env)).text();
    expect(page).toContain("Muse");
    expect(page).not.toContain(token!);
  });

  it("名前が空なら400", async () => {
    const res = await app.request(
      "/settings/mcp/connections",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ name: " " }).toString(),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("取り消すと使えなくなり、他人の接続は取り消せない", async () => {
    const mine = await issueManualConnection(env.DB, "test@example.com", "mine");
    const theirs = await issueManualConnection(env.DB, "someone@example.com", "theirs");
    for (const id of [mine.id, theirs.id]) {
      const res = await app.request(`/settings/mcp/connections/${id}/delete`, { method: "POST" }, env);
      expect(res.status).toBe(302);
    }
    expect((await listAgentConnections(env.DB, "test@example.com")).map((c) => c.id)).not.toContain(mine.id);
    expect(await listAgentConnections(env.DB, "someone@example.com")).toHaveLength(1);
  });
});

describe("scheduled", () => {
  it("期限切れの認可コードを消す", async () => {
    await issueAuthorizationCode(
      env.DB,
      { clientId: "c", redirectUri: "https://a.example/cb", codeChallenge: "x", userEmail: "cron@example.com", name: "n" },
      Date.now() - 120_000,
    );
    await worker.scheduled(createScheduledController(), env);
    expect(await env.DB.prepare("SELECT 1 FROM oauth_codes WHERE user_email = 'cron@example.com'").first()).toBeNull();
  });
});
