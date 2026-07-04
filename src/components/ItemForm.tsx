import type { FC } from "hono/jsx";
import {
  USAGE_FREQ_CRITERIA,
  WANT_LEVEL_CRITERIA,
  findCriterion,
  type RatingCriterion,
} from "../lib/ratingCriteria";

export type ItemFormValues = {
  title?: string;
  url?: string;
  price?: string;
  wantLevel?: string;
  usageFreq?: string;
};

// スライダー操作時に隣の数値表示と現在値の凡例テキストを更新する。
// ビルドステップを持たないため、フォーム内にインラインで1度だけ定義する。
const updateCriteriaScript = `
function wishlistUpdateCriteria(input) {
  var criteria = JSON.parse(input.dataset.criteria);
  var value = Number(input.value);
  var match = criteria.find(function (c) {
    if (c.level.indexOf('〜') !== -1) {
      var parts = c.level.split('〜').map(Number);
      return value >= parts[0] && value <= parts[1];
    }
    return Number(c.level) === value;
  });
  var output = input.nextElementSibling;
  if (output) output.value = input.value;
  var desc = input.closest('.field').querySelector('.criteria-current');
  if (desc && match) desc.textContent = match.level + ' = ' + match.description;
}
`;

const RangeField: FC<{
  name: string;
  value?: string;
  criteria: RatingCriterion[];
}> = ({ name, value, criteria }) => {
  const current = value ?? "5";
  const currentCriterion = findCriterion(criteria, Number(current));
  return (
    <>
      <div class="slider-row">
        <input
          type="range"
          name={name}
          min="1"
          max="10"
          step="1"
          required
          value={current}
          data-criteria={JSON.stringify(criteria)}
          oninput="wishlistUpdateCriteria(this)"
        />
        <output>{current}</output>
      </div>
      <p class="criteria-current">
        {currentCriterion
          ? `${currentCriterion.level} = ${currentCriterion.description}`
          : ""}
      </p>
    </>
  );
};

export const ItemForm: FC<{
  action: string;
  submitLabel: string;
  values?: ItemFormValues;
  error?: string;
  showContinueAdd?: boolean;
}> = ({ action, submitLabel, values, error, showContinueAdd }) => (
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
      <span class="field-label">欲しい度(1〜10)</span>
      <RangeField name="wantLevel" value={values?.wantLevel} criteria={WANT_LEVEL_CRITERIA} />
    </div>
    <div class="field">
      <span class="field-label">使用頻度(1〜10)</span>
      <RangeField name="usageFreq" value={values?.usageFreq} criteria={USAGE_FREQ_CRITERIA} />
    </div>
    <button type="submit">{submitLabel}</button>
    {showContinueAdd && (
      <button type="submit" name="continueAdding" value="1">
        連続追加(続けて次のアイテムを追加)
      </button>
    )}
    <script dangerouslySetInnerHTML={{ __html: updateCriteriaScript }} />
  </form>
);
