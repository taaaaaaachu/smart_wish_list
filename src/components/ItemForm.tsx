import type { FC } from "hono/jsx";

export type ItemFormValues = {
  title?: string;
  url?: string;
  price?: string;
  wantLevel?: string;
  usageFreq?: string;
};

export const ItemForm: FC<{
  action: string;
  submitLabel: string;
  values?: ItemFormValues;
  error?: string;
}> = ({ action, submitLabel, values, error }) => (
  <form method="post" action={action} class="item-form">
    {error && <p class="error">{error}</p>}
    <label>
      タイトル
      <input type="text" name="title" required value={values?.title ?? ""} />
    </label>
    <label>
      販売ページURL
      <input type="url" name="url" value={values?.url ?? ""} />
    </label>
    <label>
      値段(円)
      <input
        type="number"
        name="price"
        min="1"
        step="1"
        required
        value={values?.price ?? ""}
      />
    </label>
    <label>
      欲しい度(1〜10)
      <input
        type="number"
        name="wantLevel"
        min="1"
        max="10"
        step="1"
        required
        value={values?.wantLevel ?? ""}
      />
    </label>
    <label>
      使用頻度(1〜10)
      <input
        type="number"
        name="usageFreq"
        min="1"
        max="10"
        step="1"
        required
        value={values?.usageFreq ?? ""}
      />
    </label>
    <button type="submit">{submitLabel}</button>
  </form>
);
