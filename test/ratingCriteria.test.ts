import { describe, expect, it } from "vitest";
import {
  USAGE_FREQ_CRITERIA,
  WANT_LEVEL_CRITERIA,
  findCriterion,
} from "../src/lib/ratingCriteria";

describe("findCriterion", () => {
  it("欲しい度は1〜10のすべての値に対応する基準が見つかる", () => {
    for (let value = 1; value <= 10; value++) {
      const match = findCriterion(WANT_LEVEL_CRITERIA, value);
      expect(match).toBeDefined();
    }
  });

  it("使用頻度は1〜10のすべての値に対応する基準が見つかる(4,6,8を含む)", () => {
    for (let value = 1; value <= 10; value++) {
      const match = findCriterion(USAGE_FREQ_CRITERIA, value);
      expect(match, `value=${value}`).toBeDefined();
    }
  });

  it("範囲表記(2〜3)は範囲内のどちらの値にもマッチする", () => {
    expect(findCriterion(USAGE_FREQ_CRITERIA, 2)?.level).toBe("2〜3");
    expect(findCriterion(USAGE_FREQ_CRITERIA, 3)?.level).toBe("2〜3");
  });

  it("単一値の基準は完全一致した値だけにマッチする", () => {
    expect(findCriterion(USAGE_FREQ_CRITERIA, 4)?.level).toBe("4");
    expect(findCriterion(USAGE_FREQ_CRITERIA, 5)?.level).toBe("5");
  });
});
