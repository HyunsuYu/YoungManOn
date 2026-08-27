"use client";

import Link from "next/link";
import type { Policy } from "@/lib/types";
import { ddayLabel, daysUntilDeadline } from "@/lib/dday";
import BookmarkButton from "./BookmarkButton";

/** D-Day 남은 일수에 따라 배지 색상 클래스를 정합니다. */
function ddayClass(policy: Policy): string {
  const d = daysUntilDeadline(policy);
  if (d === null) return "none"; // 상시
  if (d < 0) return "expired"; // 마감
  if (d <= 3) return "urgent"; // 3일 이내: 빨강
  if (d <= 7) return "soon"; // 일주일 이내: 주황
  return "normal"; // 여유: 초록
}

function ageText(policy: Policy): string {
  if (policy.minAge == null && policy.maxAge == null) return "나이 무관";
  if (policy.minAge != null && policy.maxAge != null)
    return `만 ${policy.minAge}~${policy.maxAge}세`;
  if (policy.minAge != null) return `만 ${policy.minAge}세 이상`;
  return `만 ${policy.maxAge}세 이하`;
}

export default function PolicyCard({ policy }: { policy: Policy }) {
  return (
    <article className="policy-card">
      <div className="card-top">
        <span className="category-tag">{policy.category}</span>
        <div className="card-top-right">
          <span className={`dday ${ddayClass(policy)}`}>{ddayLabel(policy)}</span>
          <BookmarkButton policy={policy} />
        </div>
      </div>

      <h3>{policy.title}</h3>
      <p className="summary">{policy.summary}</p>

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

      <Link className="card-link" href={`/policy/${policy.id}`}>
        자세히 보기 →
      </Link>
    </article>
  );
}
