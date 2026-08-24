import type { Policy } from "./types";

/** 오늘 자정 기준 Date (시간 요소 제거) */
function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * 마감일까지 남은 일수를 계산합니다.
 * - 반환값 > 0 : D-N (N일 남음)
 * - 반환값 = 0 : D-Day (오늘 마감)
 * - 반환값 < 0 : 마감 지남
 * - null       : 상시 접수 / 마감일 없음
 */
export function daysUntilDeadline(policy: Policy): number | null {
  if (!policy.applyEnd) return null;
  const end = new Date(policy.applyEnd + "T00:00:00");
  if (Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - today().getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** D-Day 배지에 표시할 라벨 (예: "D-7", "D-DAY", "마감", "상시") */
export function ddayLabel(policy: Policy): string {
  const d = daysUntilDeadline(policy);
  if (d === null) return "상시";
  if (d < 0) return "마감";
  if (d === 0) return "D-DAY";
  return `D-${d}`;
}

/** 마감이 지났는지 여부 */
export function isExpired(policy: Policy): boolean {
  const d = daysUntilDeadline(policy);
  return d !== null && d < 0;
}
