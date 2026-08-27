"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Policy, PolicyFilter, PolicyTarget } from "@/lib/types";
import type { SortOption } from "@/lib/filter";
import { daysUntilDeadline, ddayLabel } from "@/lib/dday";
import FilterPanel from "@/components/FilterPanel";
import PolicyCard from "@/components/PolicyCard";

const PAGE_SIZE = 20;
const TARGETS: PolicyTarget[] = ["대학생", "취업준비생", "재직자", "무직"];
const SORTS: SortOption[] = ["deadline", "latest", "views"];
const SORT_LABELS: Record<SortOption, string> = {
  deadline: "마감 임박순",
  latest: "최신 등록순",
  views: "조회수순",
};

const DEFAULT_FILTER: PolicyFilter = {
  category: "전체",
  region: "전체",
  hideExpired: true,
};

/** URL 쿼리 → 필터/정렬 */
function readFromParams(sp: URLSearchParams): {
  filter: PolicyFilter;
  sort: SortOption;
} {
  const target = sp.get("target") as PolicyTarget;
  const sort = sp.get("sort") as SortOption;
  return {
    filter: {
      keyword: sp.get("keyword") || undefined,
      region: sp.get("region") || "전체",
      category: sp.get("category") || "전체",
      age: sp.get("age") ? Number(sp.get("age")) : undefined,
      target: TARGETS.includes(target) ? target : undefined,
      incomeFreeOnly: sp.get("incomeFreeOnly") === "true",
      hideExpired: sp.get("hideExpired") !== "false",
    },
    sort: SORTS.includes(sort) ? sort : "deadline",
  };
}

/** 필터/정렬 → 쿼리 파라미터 (기본값은 생략해 URL 간결화) */
function toParams(f: PolicyFilter, sort: SortOption, withPage?: number): URLSearchParams {
  const p = new URLSearchParams();
  if (f.keyword?.trim()) p.set("keyword", f.keyword.trim());
  if (f.region && f.region !== "전체") p.set("region", f.region);
  if (f.category && f.category !== "전체") p.set("category", f.category);
  if (f.age != null) p.set("age", String(f.age));
  if (f.target) p.set("target", f.target);
  if (f.incomeFreeOnly) p.set("incomeFreeOnly", "true");
  if (!f.hideExpired) p.set("hideExpired", "false");
  if (sort !== "deadline") p.set("sort", sort);
  if (withPage != null) {
    p.set("page", String(withPage));
    p.set("pageSize", String(PAGE_SIZE));
  }
  return p;
}

function SkeletonGrid() {
  return (
    <div className="policy-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="sk-line sk-tag" />
          <div className="sk-line sk-title" />
          <div className="sk-line sk-text" />
          <div className="sk-line sk-text short" />
          <div className="sk-meta" />
          <div className="sk-line sk-btn" />
        </div>
      ))}
    </div>
  );
}

function HomeContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL 로부터 초기 상태 (최초 1회)
  const initial = useMemo(
    () => readFromParams(new URLSearchParams(searchParams.toString())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [filter, setFilter] = useState<PolicyFilter>(initial.filter);
  const [sort, setSort] = useState<SortOption>(initial.sort);

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqId = useRef(0);

  const fetchPage = useCallback(
    async (targetPage: number, replace: boolean) => {
      const myReq = ++reqId.current;
      if (replace) setLoading(true);
      else setLoadingMore(true);
      try {
        const qs = toParams(filter, sort, targetPage).toString();
        const res = await fetch(`/api/policies?${qs}`);
        if (!res.ok) throw new Error("불러오기 실패");
        const data = await res.json();
        if (myReq !== reqId.current) return;
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
          setError("정책 데이터를 불러오지 못했습니다.");
      } finally {
        if (myReq === reqId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [filter, sort]
  );

  // 필터/정렬 변경 → URL 동기화 + 1페이지 재조회 (디바운스)
  useEffect(() => {
    const t = setTimeout(() => {
      const qs = toParams(filter, sort).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      fetchPage(1, true);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort]);

  const loadMore = () => {
    if (page < totalPages && !loadingMore) fetchPage(page + 1, false);
  };

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
          onReset={() => setFilter(DEFAULT_FILTER)}
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
                {SORTS.map((s) => (
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

          {!loading && !error && urgent.length > 0 && (
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
            <SkeletonGrid />
          ) : error ? (
            <div className="state-box">
              <span className="emoji">⚠️</span>
              <p style={{ marginBottom: 16 }}>{error}</p>
              <button className="load-more-btn" onClick={() => fetchPage(1, true)}>
                다시 시도
              </button>
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

export default function HomePage() {
  return (
    <Suspense fallback={<div className="layout"><SkeletonGrid /></div>}>
      <HomeContent />
    </Suspense>
  );
}
