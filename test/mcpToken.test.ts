import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "../src/index";
import {
  findUserByMcpToken,
  getMcpTokenCreatedAt,
  issueMcpToken,
  revokeMcpToken,
} from "../src/lib/mcpToken";

describe("mcpToken", () => {
  it("発行したトークンで持ち主が引け、DBには本体が残らない", async () => {
    const token = await issueMcpToken(env.DB, "a@example.com");
    expect(token).toMatch(/^swl_[0-9a-f]{64}$/);
    expect(await findUserByMcpToken(env.DB, token)).toBe("a@example.com");
    const row = await env.DB.prepare("SELECT token_hash FROM mcp_tokens").first<{
      token_hash: string;
    }>();
    expect(row?.token_hash).not.toContain(token.slice(4));
  });

  it("再発行すると古いトークンは使えなくなる", async () => {
    const old = await issueMcpToken(env.DB, "a@example.com");
    const fresh = await issueMcpToken(env.DB, "a@example.com");
    expect(await findUserByMcpToken(env.DB, old)).toBeNull();
    expect(await findUserByMcpToken(env.DB, fresh)).toBe("a@example.com");
  });

  it("無効化するとトークンは使えなくなる", async () => {
    const token = await issueMcpToken(env.DB, "a@example.com");
    await revokeMcpToken(env.DB, "a@example.com");
    expect(await findUserByMcpToken(env.DB, token)).toBeNull();
    expect(await getMcpTokenCreatedAt(env.DB, "a@example.com")).toBeNull();
  });

  it("ユーザーごとに別のトークンになる", async () => {
    const a = await issueMcpToken(env.DB, "a@example.com");
    const b = await issueMcpToken(env.DB, "b@example.com");
    expect(await findUserByMcpToken(env.DB, a)).toBe("a@example.com");
    expect(await findUserByMcpToken(env.DB, b)).toBe("b@example.com");
  });

  it("不正な形式のトークンはnull", async () => {
    expect(await findUserByMcpToken(env.DB, "")).toBeNull();
    expect(await findUserByMcpToken(env.DB, "swl_nope")).toBeNull();
  });
});

describe("MCP設定画面", () => {
  it("POST /settings/mcp/token はトークンを一度だけ表示し、キャッシュさせない", async () => {
    const res = await app.request("/settings/mcp/token", { method: "POST" }, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const html = await res.text();
    const token = html.match(/swl_[0-9a-f]{64}/)?.[0];
    expect(token).toBeDefined();
    expect(await findUserByMcpToken(env.DB, token!)).toBe("test@example.com");

    const page = await (await app.request("/settings/mcp", {}, env)).text();
    expect(page).toContain("トークン発行済み");
    expect(page).not.toContain(token!);
  });

  it("POST /settings/mcp/token/delete で無効化してリダイレクトする", async () => {
    await issueMcpToken(env.DB, "test@example.com");
    const res = await app.request("/settings/mcp/token/delete", { method: "POST" }, env);
    expect(res.status).toBe(302);
    expect(await getMcpTokenCreatedAt(env.DB, "test@example.com")).toBeNull();
  });
});
