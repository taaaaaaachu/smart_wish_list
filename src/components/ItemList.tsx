import type { FC } from "hono/jsx";
import type { Item } from "../db";
import { calcPriority } from "../lib/priority";

export const ItemList: FC<{
  items: Item[];
  emptyMessage: string;
  variant: "unpurchased" | "purchased";
}> = ({ items, emptyMessage, variant }) => {
  if (items.length === 0) {
    return <p>{emptyMessage}</p>;
  }

  return (
    <div class="table-scroll">
      <table class="item-list">
        <thead>
          <tr>
            <th>タイトル</th>
            <th>値段</th>
            <th>欲しい度</th>
            <th>使用頻度</th>
            <th>優先度</th>
            {variant === "purchased" && <th>購入日</th>}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr>
              <td>
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {item.title}
                  </a>
                ) : (
                  item.title
                )}
              </td>
              <td>{item.price.toLocaleString()}円</td>
              <td>{item.wantLevel}</td>
              <td>{item.usageFreq}</td>
              <td>
                {calcPriority(
                  item.price,
                  item.wantLevel,
                  item.usageFreq,
                ).toFixed(1)}
              </td>
              {variant === "purchased" && <td>{item.purchasedAt ?? "-"}</td>}
              <td class="item-actions">
                {variant === "unpurchased" ? (
                  <>
                    <a href={`/items/${item.id}/edit`}>編集</a>
                    <form method="post" action={`/items/${item.id}/purchase`}>
                      <button type="submit">購入済みにする</button>
                    </form>
                    <form method="post" action={`/items/${item.id}/delete`}>
                      <button type="submit">削除</button>
                    </form>
                  </>
                ) : (
                  <form method="post" action={`/items/${item.id}/unpurchase`}>
                    <button type="submit">購入を取り消す</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
