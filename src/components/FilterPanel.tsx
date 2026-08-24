"use client";

import type { PolicyFilter, PolicyTarget } from "@/lib/types";

const REGIONS = [
  "전체",
  "전국",
  "서울",
  "경기",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
];

const CATEGORIES = [
  "전체",
  "주거",
  "일자리",
  "금융/자산",
  "교육",
  "복지/문화",
];

const TARGETS: PolicyTarget[] = ["대학생", "취업준비생", "재직자", "무직"];

interface Props {
  filter: PolicyFilter;
  onChange: (next: PolicyFilter) => void;
  onReset: () => void;
}

export default function FilterPanel({ filter, onChange, onReset }: Props) {
  // 부분 업데이트 헬퍼
  const set = (patch: Partial<PolicyFilter>) => onChange({ ...filter, ...patch });

  return (
    <aside className="filter-panel">
      <h2>🔍 맞춤 필터</h2>

      <div className="filter-group">
        <label htmlFor="keyword">키워드 검색</label>
        <input
          id="keyword"
          type="text"
          placeholder="예: 월세, 장학금, 교통비"
          value={filter.keyword ?? ""}
          onChange={(e) => set({ keyword: e.target.value })}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="age">나이 (만)</label>
        <input
          id="age"
          type="number"
          min={0}
          max={99}
          placeholder="예: 24"
          value={filter.age ?? ""}
          onChange={(e) =>
            set({ age: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </div>

      <div className="filter-group">
        <label htmlFor="region">거주지</label>
        <select
          id="region"
          value={filter.region ?? "전체"}
          onChange={(e) => set({ region: e.target.value })}
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="income">소득 (기준 중위소득 %)</label>
        <input
          id="income"
          type="number"
          min={0}
          max={300}
          placeholder="예: 100"
          value={filter.incomePercent ?? ""}
          onChange={(e) =>
            set({
              incomePercent: e.target.value
                ? Number(e.target.value)
                : undefined,
            })
          }
        />
      </div>

      <div className="filter-group">
        <label>신분</label>
        <div className="chip-row">
          {TARGETS.map((t) => (
            <button
              key={t}
              type="button"
              className={`chip ${filter.target === t ? "active" : ""}`}
              onClick={() =>
                set({ target: filter.target === t ? undefined : t })
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label>분류</label>
        <div className="chip-row">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${
                (filter.category ?? "전체") === c ? "active" : ""
              }`}
              onClick={() => set({ category: c })}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={filter.hideExpired ?? false}
            onChange={(e) => set({ hideExpired: e.target.checked })}
          />
          마감된 정책 숨기기
        </label>
      </div>

      <button type="button" className="reset-btn" onClick={onReset}>
        필터 초기화
      </button>
    </aside>
  );
}
