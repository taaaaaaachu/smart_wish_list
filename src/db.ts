export type Item = {
  id: number;
  title: string;
  url: string | null;
  price: number;
  wantLevel: number;
  usageFreq: number;
  purchased: boolean;
  purchasedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ItemInput = {
  title: string;
  url: string | null;
  price: number;
  wantLevel: number;
  usageFreq: number;
};

type ItemRow = {
  id: number;
  title: string;
  url: string | null;
  price: number;
  want_level: number;
  usage_freq: number;
  purchased: number;
  purchased_at: string | null;
  created_at: string;
  updated_at: string;
};

function toItem(row: ItemRow): Item {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    price: row.price,
    wantLevel: row.want_level,
    usageFreq: row.usage_freq,
    purchased: row.purchased === 1,
    purchasedAt: row.purchased_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listItems(
  db: D1Database,
  purchased: boolean,
): Promise<Item[]> {
  const { results } = await db
    .prepare("SELECT * FROM items WHERE purchased = ? ORDER BY created_at DESC")
    .bind(purchased ? 1 : 0)
    .all<ItemRow>();
  return results.map(toItem);
}

export async function getItem(db: D1Database, id: number): Promise<Item | null> {
  const row = await db
    .prepare("SELECT * FROM items WHERE id = ?")
    .bind(id)
    .first<ItemRow>();
  return row ? toItem(row) : null;
}

export async function createItem(db: D1Database, input: ItemInput): Promise<Item> {
  const row = await db
    .prepare(
      `INSERT INTO items (title, url, price, want_level, usage_freq)
       VALUES (?, ?, ?, ?, ?)
       RETURNING *`,
    )
    .bind(input.title, input.url, input.price, input.wantLevel, input.usageFreq)
    .first<ItemRow>();
  return toItem(row!);
}

export async function updateItem(
  db: D1Database,
  id: number,
  input: ItemInput,
): Promise<Item | null> {
  const row = await db
    .prepare(
      `UPDATE items
       SET title = ?, url = ?, price = ?, want_level = ?, usage_freq = ?, updated_at = datetime('now')
       WHERE id = ?
       RETURNING *`,
    )
    .bind(input.title, input.url, input.price, input.wantLevel, input.usageFreq, id)
    .first<ItemRow>();
  return row ? toItem(row) : null;
}

export async function deleteItem(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM items WHERE id = ?").bind(id).run();
}

export async function setPurchased(
  db: D1Database,
  id: number,
  purchased: boolean,
): Promise<Item | null> {
  const row = await db
    .prepare(
      `UPDATE items
       SET purchased = ?, purchased_at = ?, updated_at = datetime('now')
       WHERE id = ?
       RETURNING *`,
    )
    .bind(purchased ? 1 : 0, purchased ? new Date().toISOString() : null, id)
    .first<ItemRow>();
  return row ? toItem(row) : null;
}
