import { NextRequest, NextResponse } from "next/server";
import { getAllPolicies, getCacheUpdatedAt } from "@/lib/youthApi";
import { getMockPolicies } from "@/data/mockPolicies";
import { filterPolicies, type SortOption } from "@/lib/filter";
import type { Policy, PolicyFilter, PolicyTarget } from "@/lib/types";

// 요청 쿼리에 따라 서버측에서 검색·필터·정렬·페이지네이션을 수행합니다.
// 전체 목록은 youthApi 에서 30분 캐시되므로 매 요청이 빠릅니다.
export const dynamic = "force-dynamic";

const TARGETS: PolicyTarget[] = ["대학생", "취업준비생", "재직자", "무직", "제한없음"];
const SORTS: SortOption[] = ["deadline", "latest", "views"];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(60, Math.max(1, Number(sp.get("pageSize")) || 20));
  const sort: SortOption = SORTS.includes(sp.get("sort") as SortOption)
    ? (sp.get("sort") as SortOption)
    : "deadline";

  const filter: PolicyFilter = {
    keyword: sp.get("keyword") || undefined,
    region: sp.get("region") || undefined,
    category: sp.get("category") || undefined,
    age: sp.get("age") ? Number(sp.get("age")) : undefined,
    incomePercent: sp.get("income") ? Number(sp.get("income")) : undefined,
    target: TARGETS.includes(sp.get("target") as PolicyTarget)
      ? (sp.get("target") as PolicyTarget)
      : undefined,
    hideExpired: sp.get("hideExpired") !== "false", // 기본 true
  };

  let all: Policy[];
  let source = "youthcenter";
  let updatedAt: string;
  try {
    all = await getAllPolicies();
    updatedAt = getCacheUpdatedAt();
  } catch (err) {
    console.error("[/api/policies] API 실패, 목업 폴백:", err);
    all = getMockPolicies();
    source = "mock";
    updatedAt = new Date().toISOString();
  }

  const filtered = filterPolicies(all, filter, sort);
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = (page - 1) * pageSize;
  const policies = filtered.slice(start, start + pageSize);

  return NextResponse.json(
    { source, updatedAt, page, pageSize, totalCount, totalPages, policies },
    { headers: { "Cache-Control": "no-store" } }
  );
}
