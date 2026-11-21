import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono } from "hono";
import { z } from "zod";
import {
  createItem,
  deleteItem,
  listItems,
  setPurchased,
  updateItem,
} from "./db";
import { selectItemsWithinBudget } from "./lib/budget";
import { findUserByMcpToken } from "./lib/mcpToken";
import { sortByPriority } from "./lib/priority";

// Cloudflare AccessはこのパスだけBypassにする前提。認証は個人アクセストークン(/settings/mcpで発行)で行う。
export const mcpRoute = new Hono<{ Bindings: Env }>();

const itemInput = {
  title: z.string().trim().min(1).describe("商品名"),
  url: z.string().optional().describe("商品ページのURL"),
  price: z.number().int().min(1).describe("値段(円)"),
  wantLevel: z.number().int().min(1).max(10).describe("欲しい度(1〜10)"),
  usageFreq: z.number().int().min(1).max(10).describe("使用頻度(1〜10)"),
};

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

function notFound(id: number) {
  return {
    content: [{ type: "text" as const, text: `id=${id} のアイテムは見つかりません。` }],
    isError: true,
  };
}

function buildServer(db: D1Database, userEmail: string): McpServer {
  const server = new McpServer({ name: "smart-wish-list", version: "0.1.0" });

  server.registerTool(
    "list_items",
    {
      description:
        "欲しいものリストを返す。未購入は優先度(値段÷(欲しい度×使用頻度)、小さいほどコスパが良い)順、購入済みは購入日の新しい順。",
      inputSchema: { purchased: z.boolean().default(false).describe("trueで購入済みを返す") },
      annotations: { readOnlyHint: true },
    },
    async ({ purchased }) => {
      const items = await listItems(db, userEmail, purchased);
      return json(
        purchased
          ? items.sort((a, b) => (b.purchasedAt ?? "").localeCompare(a.purchasedAt ?? ""))
          : sortByPriority(items),
      );
    },
  );

  server.registerTool(
    "add_item",
    { description: "欲しいものを追加する。", inputSchema: itemInput },
    async ({ url, ...rest }) => json(await createItem(db, userEmail, { ...rest, url: url?.trim() || null })),
  );

  server.registerTool(
    "update_item",
    {
      description: "アイテムの内容を書き換える(全項目を指定する)。",
      inputSchema: { id: z.number().int(), ...itemInput },
      annotations: { idempotentHint: true },
    },
    async ({ id, url, ...rest }) => {
      const item = await updateItem(db, userEmail, id, { ...rest, url: url?.trim() || null });
      return item ? json(item) : notFound(id);
    },
  );

  server.registerTool(
    "set_purchased",
    {
      description: "アイテムを購入済み(または未購入に戻す)にする。",
      inputSchema: { id: z.number().int(), purchased: z.boolean().default(true) },
      annotations: { idempotentHint: true },
    },
    async ({ id, purchased }) => {
      const item = await setPurchased(db, userEmail, id, purchased);
      return item ? json(item) : notFound(id);
    },
  );

  server.registerTool(
    "delete_item",
    {
      description: "アイテムを削除する。元に戻せない。",
      inputSchema: { id: z.number().int() },
      annotations: { destructiveHint: true },
    },
    async ({ id }) => {
      await deleteItem(db, userEmail, id);
      return json({ deleted: id });
    },
  );

  server.registerTool(
    "suggest_within_budget",
    {
      description:
        "予算内で、コスパ(欲しい度×使用頻度÷値段)の合計が最大になる未購入アイテムの組み合わせを返す。",
      inputSchema: { budget: z.number().int().min(0).describe("予算(円)") },
      annotations: { readOnlyHint: true },
    },
    async ({ budget }) =>
      json(selectItemsWithinBudget(await listItems(db, userEmail, false), budget)),
  );

  return server;
}

mcpRoute.all("/", async (c) => {
  const token = c.req.header("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const userEmail = token ? await findUserByMcpToken(c.env.DB, token) : null;
  if (!userEmail) {
    c.header("WWW-Authenticate", 'Bearer realm="smart-wish-list"');
    return c.json({ error: "有効なトークンが必要です。/settings/mcp で発行してください。" }, 401);
  }

  // ステートレス(セッションなし)で1リクエストごとにサーバーを作る。Durable Objectsを使わず無料枠を節約するため。
  const server = buildServer(c.env.DB, userEmail);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});
