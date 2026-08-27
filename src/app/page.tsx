"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Policy, PolicyFilter } from "@/lib/types";
import type { SortOption } from "@/lib/filter";
import { daysUntilDeadline, ddayLabel } from "@/lib/dday";
import FilterPanel from "@/components/FilterPanel";
import PolicyCard from "@/components/PolicyCard";

const EMPTY_FILTER: PolicyFilter = {
  category: "전체",
  region: "전체",
  hideExpired: true,
};
const PAGE_SIZE = 20;

const SORT_LABELS: Record<SortOption, string> = {
  deadline: "마감 임박순",
  latest: "최신 등록순",
  views: "조회수순",
};

/** 필터+정렬+페이지 → 쿼리스트링 */
function buildQuery(f: PolicyFilter, sort: SortOption, page: number): string {
  const p = new URLSearchParams();
  if (f.keyword?.trim()) p.set("keyword", f.keyword.trim());
  if (f.region && f.region !== "전체") p.set("region", f.region);
  if (f.category && f.category !== "전체") p.set("category", f.category);
  if (f.age != null) p.set("age", String(f.age));
  if (f.incomePercent != null) p.set("income", String(f.incomePercent));
  if (f.target) p.set("target", f.target);
  p.set("hideExpired", f.hideExpired ? "true" : "false");
  p.set("sort", sort);
  p.set("page", String(page));
  p.set("pageSize", String(PAGE_SIZE));
  return p.toString();
}

export default function HomePage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // 최초/필터 변경 로딩
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<PolicyFilter>(EMPTY_FILTER);
  const [sort, setSort] = useState<SortOption>("deadline");

  // 최신 요청만 반영하기 위한 토큰 (경쟁 상태 방지)
  const reqId = useRef(0);

  const fetchPage = useCallback(
    async (targetPage: number, replace: boolean) => {
      const myReq = ++reqId.current;
      if (replace) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await fetch(`/api/policies?${buildQuery(filter, sort, targetPage)}`);
        if (!res.ok) throw new Error("불러오기 실패");
        const data = await res.json();
        if (myReq !== reqId.current) return; // 더 최신 요청이 있으면 폐기
        setTotalCount(data.totalCount ?? 0);
        setTotalPages(data.totalPages ?? 1);
        setUpdatedAt(data.updatedAt ?? null);
        setPage(targetPage);
        setPolicies((prev) =>
          replace ? data.policies ?? [] : [...prev, ...(data.policies ?? [])]
        );
        setError(null);
      } catch {
        if (myReq === reqId.current)
          setError("정책 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        if (myReq === reqId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [filter, sort]
  );

  // 필터/정렬이 바뀌면 1페이지부터 다시 로드 (키워드는 디바운스)
  useEffect(() => {
    const t = setTimeout(() => fetchPage(1, true), 250);
    return () => clearTimeout(t);
  }, [fetchPage]);

  const loadMore = () => {
    if (page < totalPages && !loadingMore) fetchPage(page + 1, false);
  };

  // 마감 임박(D-7 이내) — 현재 로드된 목록 기준 상단 배너
  const urgent = useMemo(
    () =>
      policies
        .filter((p) => {
          const d = daysUntilDeadline(p);
          return d !== null && d >= 0 && d <= 7;
        })
        .slice(0, 4),
    [policies]
  );

  return (
    <>
      <header className="site-header">
        <div className="inner">
          <span className="badge">청년ON · 청년·대학생 맞춤형 정책 큐레이터</span>
          <h1>흩어진 청년 혜택, 청년ON에서 한 번에.</h1>
          <p>
            정부·지자체에 흩어진 청년 지원 정책을 나이·거주지·소득·신분에 맞춰
            골라 보여드립니다. 놓치기 쉬운 신청 마감일도 D-Day로 한눈에 확인하세요.
          </p>
        </div>
      </header>

      <div className="layout">
        <FilterPanel
          filter={filter}
          onChange={setFilter}
          onReset={() => setFilter(EMPTY_FILTER)}
        />

        <main>
          <div className="results-head">
            <div className="count">
              조건에 맞는 정책 <b>{loading ? "…" : totalCount}</b>건
            </div>
            <div className="results-tools">
              <select
                className="sort-select"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                aria-label="정렬"
              >
                {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
                  <option key={s} value={s}>
                    {SORT_LABELS[s]}
                  </option>
                ))}
              </select>
              {updatedAt && (
                <span className="updated">
                  업데이트 {new Date(updatedAt).toLocaleString("ko-KR")}
                </span>
              )}
            </div>
          </div>

          {!loading && urgent.length > 0 && (
            <div className="urgent-banner">
              <b>⏰ 마감 임박!</b>{" "}
              {urgent.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && " · "}
                  {p.title} <b className="dd">({ddayLabel(p)})</b>
                </span>
              ))}
            </div>
          )}

          {loading ? (
            <div className="state-box">
              <div className="spinner" />
              청년정책을 불러오는 중입니다…
            </div>
          ) : error ? (
            <div className="state-box">
              <span className="emoji">⚠️</span>
              {error}
            </div>
          ) : policies.length === 0 ? (
            <div className="state-box">
              <span className="emoji">🔍</span>
              조건에 맞는 정책이 없어요. 필터를 넓혀보세요.
            </div>
          ) : (
            <>
              <div className="policy-grid">
                {policies.map((p) => (
                  <PolicyCard key={p.id} policy={p} />
                ))}
              </div>

              <div className="load-more-wrap">
                <span className="page-info">
                  전체 {totalCount}건 중 {policies.length}건 표시
                </span>
                {page < totalPages && (
                  <button
                    className="load-more-btn"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "불러오는 중…" : "더 보기"}
                  </button>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <footer className="footer">
        청년ON · 데이터 출처: 온통청년(youthcenter.go.kr) 청년정책 통합 API ·
        대학 과제 프로젝트
      </footer>
    </>
  );
}
