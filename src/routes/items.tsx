import { Hono } from "hono";
import { ItemForm } from "../components/ItemForm";
import { ItemList } from "../components/ItemList";
import { Layout } from "../components/Layout";
import {
  createItem,
  deleteItem,
  getItem,
  listItems,
  setPurchased,
  updateItem,
  type Item,
} from "../db";
import { parseItemForm } from "../lib/itemForm";
import { calcPriority } from "../lib/priority";

export const itemsRoute = new Hono<{ Bindings: Env }>();

function sortByPriority(items: Item[]): Item[] {
  return [...items].sort(
    (a, b) =>
      calcPriority(a.price, a.wantLevel, a.usageFreq) -
      calcPriority(b.price, b.wantLevel, b.usageFreq),
  );
}

itemsRoute.get("/", async (c) => {
  const items = sortByPriority(await listItems(c.env.DB, false));
  return c.html(
    <Layout title="未購入一覧">
      <h1>未購入アイテム(優先度順)</h1>
      <ItemList
        items={items}
        emptyMessage="登録されているアイテムはありません。"
        variant="unpurchased"
      />
    </Layout>,
  );
});

itemsRoute.get("/purchased", async (c) => {
  const items = await listItems(c.env.DB, true);
  items.sort((a, b) => (b.purchasedAt ?? "").localeCompare(a.purchasedAt ?? ""));
  return c.html(
    <Layout title="購入済み一覧">
      <h1>購入済みアイテム</h1>
      <ItemList
        items={items}
        emptyMessage="購入済みのアイテムはありません。"
        variant="purchased"
      />
    </Layout>,
  );
});

itemsRoute.get("/items/new", (c) => {
  return c.html(
    <Layout title="アイテム追加">
      <h1>アイテムを追加</h1>
      <ItemForm action="/items" submitLabel="追加" />
    </Layout>,
  );
});

itemsRoute.post("/items", async (c) => {
  const raw = await c.req.parseBody();
  const result = parseItemForm(raw);
  if (!result.ok) {
    return c.html(
      <Layout title="アイテム追加">
        <h1>アイテムを追加</h1>
        <ItemForm
          action="/items"
          submitLabel="追加"
          values={result.values}
          error={result.error}
        />
      </Layout>,
      400,
    );
  }
  await createItem(c.env.DB, result.input);
  return c.redirect("/");
});

itemsRoute.get("/items/:id/edit", async (c) => {
  const id = Number(c.req.param("id"));
  const item = await getItem(c.env.DB, id);
  if (!item) {
    return c.notFound();
  }
  return c.html(
    <Layout title="アイテム編集">
      <h1>アイテムを編集</h1>
      <ItemForm
        action={`/items/${id}`}
        submitLabel="更新"
        values={{
          title: item.title,
          url: item.url ?? "",
          price: String(item.price),
          wantLevel: String(item.wantLevel),
          usageFreq: String(item.usageFreq),
        }}
      />
    </Layout>,
  );
});

itemsRoute.post("/items/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const raw = await c.req.parseBody();
  const result = parseItemForm(raw);
  if (!result.ok) {
    return c.html(
      <Layout title="アイテム編集">
        <h1>アイテムを編集</h1>
        <ItemForm
          action={`/items/${id}`}
          submitLabel="更新"
          values={result.values}
          error={result.error}
        />
      </Layout>,
      400,
    );
  }
  const updated = await updateItem(c.env.DB, id, result.input);
  if (!updated) {
    return c.notFound();
  }
  return c.redirect("/");
});

itemsRoute.post("/items/:id/delete", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteItem(c.env.DB, id);
  return c.redirect("/");
});

itemsRoute.post("/items/:id/purchase", async (c) => {
  const id = Number(c.req.param("id"));
  const updated = await setPurchased(c.env.DB, id, true);
  if (!updated) {
    return c.notFound();
  }
  return c.redirect("/");
});

itemsRoute.post("/items/:id/unpurchase", async (c) => {
  const id = Number(c.req.param("id"));
  const updated = await setPurchased(c.env.DB, id, false);
  if (!updated) {
    return c.notFound();
  }
  return c.redirect("/purchased");
});
