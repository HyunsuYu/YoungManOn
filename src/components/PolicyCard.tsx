"use client";

import type { Policy } from "@/lib/types";
import { ddayLabel, daysUntilDeadline } from "@/lib/dday";
import BookmarkButton from "./BookmarkButton";
import PolicyImage from "./PolicyImage";

function ddayClass(policy: Policy): string {
  const d = daysUntilDeadline(policy);
  if (d === null) return "none";
  if (d < 0) return "expired";
  if (d <= 3) return "urgent";
  if (d <= 7) return "soon";
  return "normal";
}

function ageText(policy: Policy): string {
  if (policy.minAge == null && policy.maxAge == null) return "나이 무관";
  if (policy.minAge != null && policy.maxAge != null)
    return `만 ${policy.minAge}~${policy.maxAge}세`;
  if (policy.minAge != null) return `만 ${policy.minAge}세 이상`;
  return `만 ${policy.maxAge}세 이하`;
}

interface Props {
  policy: Policy;
  onSelect: (policy: Policy) => void;
  active?: boolean;
}

export default function PolicyCard({ policy, onSelect, active }: Props) {
  return (
    <article
      className={`policy-card ${active ? "active" : ""}`}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={() => onSelect(policy)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(policy);
        }
      }}
    >
      {/* 1) 제목 */}
      <div className="card-head">
        <h3>{policy.title}</h3>
        <BookmarkButton policy={policy} />
      </div>

      {/* 2) 공고 이미지 (없으면 플레이스홀더/대체) + 분류·D-Day 오버레이 */}
      <div className="card-image-wrap">
        <PolicyImage policy={policy} />
        <span className="category-tag overlay">{policy.category}</span>
        <span className={`dday overlay ${ddayClass(policy)}`}>
          {ddayLabel(policy)}
        </span>
      </div>

      {/* 3) 설명 (주관/지역/나이/소득/마감) */}
      <div className="policy-meta">
        <div className="row">
          <span>주관</span>
          <span>{policy.provider}</span>
        </div>
        <div className="row">
          <span>지역</span>
          <span>{policy.region}</span>
        </div>
        <div className="row">
          <span>나이</span>
          <span>{ageText(policy)}</span>
        </div>
        <div className="row">
          <span>소득</span>
          <span>{policy.incomeCondition}</span>
        </div>
        <div className="row">
          <span>마감</span>
          <span>{policy.applyEnd ?? "상시 접수"}</span>
        </div>
      </div>

      {/* 공고 바로가기 (외부 사이트) — 카드 클릭(상세 패널)과 분리 */}
      <a
        className="card-link"
        href={policy.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        공고 바로가기 →
      </a>
    </article>
  );
}
