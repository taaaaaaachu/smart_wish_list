import { createMcpHandler, McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import { Hono } from "hono";
import { z } from "zod";
import {
  createItem,
  deleteItem,
  listItems,
  setPurchased,
  updateItem,
} from "./db";
import { authenticateAgent } from "./lib/agentConnections";
import { selectItemsWithinBudget } from "./lib/budget";
import { sortByPriority } from "./lib/priority";
import { issuerOf } from "./routes/oauth";

/**
 * エージェント向けのMCPエンドポイント(attendance-manager-web と同じ方式)。Cloudflare AccessをBypassするパスなので
 * requireUser は通さず、毎リクエスト Bearer トークン(手動発行・OAuth)だけで接続を確かめる。
 * セッションは持たない(ステートレス)。トークンはこのエンドポイント以外では受け付けない。
 */

const INSTRUCTIONS = `欲しいものリストは、欲しい物を「値段」「欲しい度(1〜10)」「使用頻度(1〜10)」で登録し、コスパで並べるアプリです。
- 優先度 = 値段 ÷(欲しい度 × 使用頻度)。小さいほどコスパが良い。
- 値段は円の整数で渡します。
- この接続で操作できるのは、接続を許可したユーザー本人のリストだけです。`;

const itemInput = {
  title: z.string().trim().min(1).max(200).describe("商品名"),
  url: z.string().max(2048).optional().describe("商品ページのURL"),
  price: z.number().int().min(1).describe("値段(円)"),
  wantLevel: z.number().int().min(1).max(10).describe("欲しい度(1〜10)"),
  usageFreq: z.number().int().min(1).max(10).describe("使用頻度(1〜10)"),
};
const id = z.number().int().describe("アイテムのID");

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const IDEMPOTENT = { ...WRITE, idempotentHint: true };
const DESTRUCTIVE = { ...IDEMPOTENT, destructiveHint: true };

function ok(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}
function fail(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}
const notFound = (itemId: number) => fail(`id=${itemId} のアイテムは見つかりません。`);
const urlOf = (url: string | undefined) => url?.trim() || null;

export function createMcpServer(db: D1Database, userEmail: string): McpServer {
  const server = new McpServer({ name: "smart-wish-list", version: "1.0.0" }, { instructions: INSTRUCTIONS });

  server.registerTool(
    "list_items",
    {
      title: "アイテム一覧",
      description: "未購入は優先度の高い(コスパの良い)順、購入済みは購入日の新しい順に返す。",
      inputSchema: z.object({ purchased: z.boolean().optional().describe("trueで購入済みを返す(省略時false)") }),
      annotations: READ,
    },
    async ({ purchased = false }) => {
      const items = await listItems(db, userEmail, purchased);
      return ok({
        items: purchased
          ? items.sort((a, b) => (b.purchasedAt ?? "").localeCompare(a.purchasedAt ?? ""))
          : sortByPriority(items),
      });
    },
  );

  server.registerTool(
    "add_item",
    { title: "アイテムを追加", description: "欲しいものを追加する。", inputSchema: z.object(itemInput), annotations: WRITE },
    async ({ url, ...rest }) => ok(await createItem(db, userEmail, { ...rest, url: urlOf(url) })),
  );

  server.registerTool(
    "update_item",
    {
      title: "アイテムを編集",
      description: "アイテムの内容を書き換える(全項目を指定する)。",
      inputSchema: z.object({ id, ...itemInput }),
      annotations: IDEMPOTENT,
    },
    async ({ id: itemId, url, ...rest }) => {
      const item = await updateItem(db, userEmail, itemId, { ...rest, url: urlOf(url) });
      return item ? ok(item) : notFound(itemId);
    },
  );

  server.registerTool(
    "set_purchased",
    {
      title: "購入済みにする",
      description: "アイテムを購入済みにする。purchased: false で未購入に戻す。",
      inputSchema: z.object({ id, purchased: z.boolean().optional().describe("省略時true") }),
      annotations: IDEMPOTENT,
    },
    async ({ id: itemId, purchased = true }) => {
      const item = await setPurchased(db, userEmail, itemId, purchased);
      return item ? ok(item) : notFound(itemId);
    },
  );

  server.registerTool(
    "delete_item",
    { title: "アイテムを削除", description: "アイテムを削除する。元に戻せない。", inputSchema: z.object({ id }), annotations: DESTRUCTIVE },
    async ({ id: itemId }) => {
      await deleteItem(db, userEmail, itemId);
      return ok({ deleted: itemId });
    },
  );

  server.registerTool(
    "suggest_within_budget",
    {
      title: "予算で選ぶ",
      description: "予算内で、コスパ(欲しい度×使用頻度÷値段)の合計が最大になる未購入アイテムの組み合わせを返す。",
      inputSchema: z.object({ budget: z.number().int().min(0).describe("予算(円)") }),
      annotations: READ,
    },
    async ({ budget }) => ok(selectItemsWithinBudget(await listItems(db, userEmail, false), budget)),
  );

  return server;
}

/** 401で認可サーバーの在処を知らせる(RFC 9728) */
function unauthorized(url: string): Response {
  const metadata = `${issuerOf(url)}/.well-known/oauth-protected-resource/mcp`;
  return Response.json(
    { error: "invalid_token", error_description: "エージェント接続のトークンが必要です。" },
    { status: 401, headers: { "WWW-Authenticate": `Bearer resource_metadata="${metadata}"` } },
  );
}

export const mcpRoutes = new Hono<{ Bindings: Env }>();

mcpRoutes.all("/", async (c) => {
  const token = c.req.header("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const agent = token ? await authenticateAgent(c.env.DB, token) : null;
  if (!token || !agent) return unauthorized(c.req.url);
  const handler = createMcpHandler(() => createMcpServer(c.env.DB, agent.userEmail));
  return handler.fetch(c.req.raw, { authInfo: { token, clientId: agent.connectionId, scopes: [] } });
});
