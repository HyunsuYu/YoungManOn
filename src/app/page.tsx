"use client";

import { useEffect, useMemo, useState } from "react";
import type { Policy, PolicyFilter } from "@/lib/types";
import { filterPolicies } from "@/lib/filter";
import { daysUntilDeadline, ddayLabel } from "@/lib/dday";
import FilterPanel from "@/components/FilterPanel";
import PolicyCard from "@/components/PolicyCard";

const EMPTY_FILTER: PolicyFilter = { category: "전체", region: "전체" };

export default function HomePage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PolicyFilter>(EMPTY_FILTER);

  // 접속(마운트) 시 서버 라우트에서 실시간으로 정책 목록을 가져옵니다.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/policies");
        if (!res.ok) throw new Error("불러오기 실패");
        const data = await res.json();
        if (!alive) return;
        setPolicies(data.policies ?? []);
        setUpdatedAt(data.updatedAt ?? null);
      } catch {
        if (alive) setError("정책 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 필터는 브라우저에서 즉시 적용 (마감 임박순 정렬 포함)
  const filtered = useMemo(
    () => filterPolicies(policies, filter),
    [policies, filter]
  );

  // 마감 임박(D-7 이내, 아직 마감 안 됨) 정책 — 상단 배너용
  const urgent = useMemo(
    () =>
      filtered
        .filter((p) => {
          const d = daysUntilDeadline(p);
          return d !== null && d >= 0 && d <= 7;
        })
        .slice(0, 4),
    [filtered]
  );

  return (
    <>
      <header className="site-header">
        <div className="inner">
          <span className="badge">청년ON · 청년·대학생 맞춤형 정책 큐레이터</span>
          <h1>흩어진 청년 혜택, 청년ON에서 한 번에.</h1>
          <p>
            정부·지자체에 흩어진 청년 지원 정책을 나이·거주지·소득·신분에 맞춰
            실시간으로 골라 보여드립니다. 놓치기 쉬운 신청 마감일도 D-Day로
            한눈에 확인하세요.
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
              조건에 맞는 정책 <b>{loading ? "…" : filtered.length}</b>건
            </div>
            {updatedAt && (
              <div className="updated">
                업데이트 {new Date(updatedAt).toLocaleString("ko-KR")}
              </div>
            )}
          </div>

          {/* 마감 임박 배너 */}
          {!loading && urgent.length > 0 && (
            <div
              style={{
                background: "#fff4e6",
                border: "1px solid #ffd8a8",
                borderRadius: 14,
                padding: "14px 18px",
                marginBottom: 18,
                fontSize: 14,
              }}
            >
              <b style={{ color: "#e8590c" }}>⏰ 마감 임박!</b>{" "}
              {urgent.map((p, i) => (
                <span key={p.id} style={{ color: "#7a4a10" }}>
                  {i > 0 && " · "}
                  {p.title}{" "}
                  <b style={{ color: "#e8590c" }}>({ddayLabel(p)})</b>
                </span>
              ))}
            </div>
          )}

          {loading ? (
            <div className="state-box">
              <div className="spinner" />
              실시간으로 청년정책을 불러오는 중입니다…
            </div>
          ) : error ? (
            <div className="state-box">
              <span className="emoji">⚠️</span>
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="state-box">
              <span className="emoji">🔍</span>
              조건에 맞는 정책이 없어요. 필터를 넓혀보세요.
            </div>
          ) : (
            <div className="policy-grid">
              {filtered.map((p) => (
                <PolicyCard key={p.id} policy={p} />
              ))}
            </div>
          )}
        </main>
      </div>

      <footer className="footer">
        청년ON · 데이터 출처: 온통청년 · 공공데이터포털 (현재 샘플 데이터로 시연 중) ·
        대학 과제 프로젝트
      </footer>
    </>
  );
}
