"use client";

import type { PolicyFilter, PolicyTarget } from "@/lib/types";
import { useProfile } from "@/lib/useProfile";

const REGIONS = [
  "전체", "전국", "서울", "경기", "인천", "부산", "대구", "광주", "대전",
  "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

const CATEGORIES = ["전체", "일자리", "주거", "교육", "복지·문화", "참여·권리"];
const TARGETS: PolicyTarget[] = ["대학생", "취업준비생", "재직자", "무직"];
const AGE_MIN = 15;
const AGE_MAX = 39;

interface Props {
  filter: PolicyFilter;
  onChange: (next: PolicyFilter) => void;
  onReset: () => void;
}

export default function FilterPanel({ filter, onChange, onReset }: Props) {
  const set = (patch: Partial<PolicyFilter>) => onChange({ ...filter, ...patch });
  const { profile, ready, save, clear } = useProfile();

  const applyProfile = () => {
    if (!profile) return;
    set({
      age: profile.age,
      region: profile.region ?? "전체",
      target: profile.target,
      incomeFreeOnly: profile.incomeFreeOnly,
    });
  };

  const saveProfile = () =>
    save({
      age: filter.age,
      region: filter.region,
      target: filter.target,
      incomeFreeOnly: filter.incomeFreeOnly,
    });

  const profileSummary = profile
    ? [
        profile.age != null ? `만 ${profile.age}세` : null,
        profile.region && profile.region !== "전체" ? profile.region : null,
        profile.target ?? null,
        profile.incomeFreeOnly ? "소득무관" : null,
      ]
        .filter(Boolean)
        .join(" · ") || "조건 없음"
    : null;

  return (
    <aside className="filter-panel">
      <h2>🔍 맞춤 필터</h2>

      {/* 프로필 */}
      {ready && (
        <div className="profile-box">
          {profile ? (
            <>
              <div className="profile-summary">
                <span className="profile-label">내 프로필</span>
                <span>{profileSummary}</span>
              </div>
              <div className="profile-actions">
                <button type="button" className="mini-btn primary" onClick={applyProfile}>
                  프로필 적용
                </button>
                <button type="button" className="mini-btn" onClick={saveProfile}>
                  현재 조건으로 갱신
                </button>
                <button type="button" className="mini-btn ghost" onClick={clear}>
                  삭제
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="mini-btn primary full" onClick={saveProfile}>
              ⭐ 현재 조건을 내 프로필로 저장
            </button>
          )}
        </div>
      )}

      <div className="filter-group">
        <label htmlFor="keyword">키워드 검색</label>
        <input
          id="keyword"
          type="text"
          placeholder="예: 월세, 장학금, 창업"
          value={filter.keyword ?? ""}
          onChange={(e) => set({ keyword: e.target.value })}
        />
      </div>

      <div className="filter-group">
        <div className="age-head">
          <label htmlFor="age">나이</label>
          <label className="age-any">
            <input
              type="checkbox"
              checked={filter.age == null}
              onChange={(e) => set({ age: e.target.checked ? undefined : 24 })}
            />
            나이 무관
          </label>
        </div>
        <div className="age-slider">
          <input
            id="age"
            type="range"
            min={AGE_MIN}
            max={AGE_MAX}
            value={filter.age ?? 24}
            disabled={filter.age == null}
            onChange={(e) => set({ age: Number(e.target.value) })}
          />
          <span className="age-value">
            {filter.age == null ? "전체" : `만 ${filter.age}세`}
          </span>
        </div>
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
        <label>신분</label>
        <div className="chip-row">
          {TARGETS.map((t) => (
            <button
              key={t}
              type="button"
              className={`chip ${filter.target === t ? "active" : ""}`}
              onClick={() => set({ target: filter.target === t ? undefined : t })}
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
              className={`chip ${(filter.category ?? "전체") === c ? "active" : ""}`}
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
            checked={filter.incomeFreeOnly ?? false}
            onChange={(e) => set({ incomeFreeOnly: e.target.checked })}
          />
          소득 조건 없는 정책만
        </label>
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
