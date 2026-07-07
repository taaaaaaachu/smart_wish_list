import { Hono } from "hono";
import { ItemList } from "../components/ItemList";
import { Layout } from "../components/Layout";
import { listItems } from "../db";
import { selectItemsWithinBudget } from "../lib/budget";

export const budgetRoute = new Hono<{
  Bindings: Env;
  Variables: { userEmail: string };
}>();

function BudgetForm({
  value,
  submitLabel,
}: {
  value?: string;
  submitLabel: string;
}) {
  return (
    <form method="post" action="/budget" class="budget-form">
      <label>
        予算(円)
        <input
          type="number"
          name="budget"
          min="0"
          step="1"
          required
          value={value ?? ""}
        />
      </label>
      <button type="submit">{submitLabel}</button>
    </form>
  );
}

budgetRoute.get("/budget", (c) => {
  return c.html(
    <Layout title="予算で選ぶ">
      <h1>予算内で買うものを選ぶ</h1>
      <BudgetForm submitLabel="計算する" />
    </Layout>,
  );
});

budgetRoute.post("/budget", async (c) => {
  const raw = await c.req.parseBody();
  const budgetStr = typeof raw.budget === "string" ? raw.budget : "";
  const budget = Number(budgetStr);

  if (!Number.isInteger(budget) || budget < 0) {
    return c.html(
      <Layout title="予算で選ぶ">
        <h1>予算内で買うものを選ぶ</h1>
        <p class="error">予算は0以上の整数で入力してください。</p>
        <BudgetForm value={budgetStr} submitLabel="計算する" />
      </Layout>,
      400,
    );
  }

  const items = await listItems(c.env.DB, c.get("userEmail"), false);
  const result = selectItemsWithinBudget(items, budget);
  const selectedIds = new Set(result.selected.map((item) => item.id));
  const notSelected = items.filter((item) => !selectedIds.has(item.id));

  return c.html(
    <Layout title="予算で選ぶ">
      <h1>予算{budget.toLocaleString()}円で買うもの</h1>
      <p>
        合計 {result.totalPrice.toLocaleString()}円 / 残り{" "}
        {result.remaining.toLocaleString()}円
      </p>
      <ItemList
        items={result.selected}
        emptyMessage="この予算で買えるアイテムはありません。"
        variant="unpurchased"
      />
      <BudgetForm value={budgetStr} submitLabel="再計算する" />
      <h2>選ばれなかったアイテム</h2>
      <ItemList
        items={notSelected}
        emptyMessage="すべての未購入アイテムが候補に選ばれました。"
        variant="unpurchased"
      />
    </Layout>,
  );
});
