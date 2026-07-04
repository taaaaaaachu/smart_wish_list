import type { FC } from "hono/jsx";
import {
  USAGE_FREQ_CRITERIA,
  WANT_LEVEL_CRITERIA,
  type RatingCriterion,
} from "../lib/ratingCriteria";

export type ItemFormValues = {
  title?: string;
  url?: string;
  price?: string;
  wantLevel?: string;
  usageFreq?: string;
};

const CriteriaDetails: FC<{ summary: string; items: RatingCriterion[] }> = ({
  summary,
  items,
}) => (
  <details class="criteria">
    <summary>{summary}</summary>
    <ul class="criteria-list">
      {items.map((item) => (
        <li>
          <strong>{item.level}</strong> = {item.description}
        </li>
      ))}
    </ul>
  </details>
);

const RangeField: FC<{ name: string; value?: string }> = ({
  name,
  value,
}) => {
  const current = value ?? "5";
  return (
    <div class="slider-row">
      <input
        type="range"
        name={name}
        min="1"
        max="10"
        step="1"
        required
        value={current}
        oninput="this.nextElementSibling.value = this.value"
      />
      <output>{current}</output>
    </div>
  );
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
    <div class="field">
      <CriteriaDetails summary="欲しい度(1〜10)" items={WANT_LEVEL_CRITERIA} />
      <RangeField name="wantLevel" value={values?.wantLevel} />
    </div>
    <div class="field">
      <CriteriaDetails summary="使用頻度(1〜10)" items={USAGE_FREQ_CRITERIA} />
      <RangeField name="usageFreq" value={values?.usageFreq} />
    </div>
    <button type="submit">{submitLabel}</button>
  </form>
);
