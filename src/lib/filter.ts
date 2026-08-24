import type { Policy, PolicyFilter } from "./types";
import { isExpired } from "./dday";

/** 정책 하나가 필터 조건을 통과하는지 검사 */
function matches(policy: Policy, f: PolicyFilter): boolean {
  // 나이: 정책의 [minAge, maxAge] 범위 안에 들어와야 통과 (null이면 제한 없음)
  if (f.age != null) {
    if (policy.minAge != null && f.age < policy.minAge) return false;
    if (policy.maxAge != null && f.age > policy.maxAge) return false;
  }

  // 지역: "전국" 정책은 항상 통과, 그 외엔 지역이 일치해야 통과
  if (f.region && f.region !== "전체") {
    if (policy.region !== "전국" && policy.region !== f.region) return false;
  }

  // 소득: 내 소득(%)이 정책 상한 이하일 때 통과 (상한 null이면 무관하게 통과)
  if (f.incomePercent != null && policy.incomeMaxPercent != null) {
    if (f.incomePercent > policy.incomeMaxPercent) return false;
  }

  // 대상 유형: "제한없음" 정책은 항상 통과
  if (f.target) {
    const ok =
      policy.targets.includes(f.target) || policy.targets.includes("제한없음");
    if (!ok) return false;
  }

  // 분류
  if (f.category && f.category !== "전체") {
    if (policy.category !== f.category) return false;
  }

  // 키워드: 제목/요약/태그에 포함되면 통과
  if (f.keyword && f.keyword.trim()) {
    const kw = f.keyword.trim().toLowerCase();
    const haystack = [
      policy.title,
      policy.summary,
      policy.provider,
      ...policy.tags,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(kw)) return false;
  }

  // 마감 지난 정책 숨기기
  if (f.hideExpired && isExpired(policy)) return false;

  return true;
}

/** 필터 적용 + 마감 임박순 정렬 */
export function filterPolicies(policies: Policy[], f: PolicyFilter): Policy[] {
  return policies
    .filter((p) => matches(p, f))
    .sort((a, b) => sortByDeadline(a, b));
}

/** 마감 임박(가까운 마감일)이 위로, 상시/마감없음은 아래로 */
function sortByDeadline(a: Policy, b: Policy): number {
  const ax = a.applyEnd ? new Date(a.applyEnd).getTime() : Infinity;
  const bx = b.applyEnd ? new Date(b.applyEnd).getTime() : Infinity;
  return ax - bx;
}
