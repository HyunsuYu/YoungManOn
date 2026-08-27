"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PolicyStats } from "@/lib/types";

function BarList({ data, max }: { data: [string, number][]; max: number }) {
  return (
    <div className="bar-list">
      {data.map(([label, count]) => (
        <div className="bar-row" key={label}>
          <span className="bar-label">{label}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${max ? (count / max) * 100 : 0}%` }}
            />
          </div>
          <span className="bar-count">{count.toLocaleString("ko-KR")}</span>
        </div>
      ))}
    </div>
  );
}

function StatSkeleton() {
  return (
    <>
      <div className="stat-cards">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="stat-card" key={i}>
            <div className="sk-line" style={{ height: 28, width: "60%" }} />
            <div className="sk-line" style={{ height: 13, width: "80%", marginTop: 8 }} />
          </div>
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div className="stat-section" key={i}>
          <div className="sk-line" style={{ height: 18, width: 140, marginBottom: 18 }} />
          {Array.from({ length: 5 }).map((_, j) => (
            <div className="sk-line" style={{ height: 22, marginBottom: 12 }} key={j} />
          ))}
        </div>
      ))}
    </>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<PolicyStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (alive) setStats(data);
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const catMax = stats?.byCategory[0]?.[1] ?? 0;
  const regMax = stats?.byRegion[0]?.[1] ?? 0;
  const tgtMax = stats?.byTarget[0]?.[1] ?? 0;

  return (
    <div className="simple-page">
      <div className="simple-head">
        <h1>📊 청년정책 통계</h1>
        <p>온통청년에 등록된 전체 청년정책의 분포입니다.</p>
      </div>

      {error ? (
        <div className="state-box">
          <span className="emoji">⚠️</span>
          통계를 불러오지 못했습니다.
        </div>
      ) : !stats ? (
        <StatSkeleton />
      ) : (
        <>
          <div className="stat-cards">
            <div className="stat-card">
              <span className="stat-num">{stats.total.toLocaleString("ko-KR")}</span>
              <span className="stat-cap">전체 정책</span>
            </div>
            <div className="stat-card">
              <span className="stat-num accent">{stats.active.toLocaleString("ko-KR")}</span>
              <span className="stat-cap">신청 가능</span>
            </div>
            <div className="stat-card">
              <span className="stat-num warn">{stats.closingSoon.toLocaleString("ko-KR")}</span>
              <span className="stat-cap">7일 내 마감</span>
            </div>
            <div className="stat-card">
              <span className="stat-num">{stats.always.toLocaleString("ko-KR")}</span>
              <span className="stat-cap">상시 접수</span>
            </div>
          </div>

          <section className="stat-section">
            <h2>분류별 정책 수</h2>
            <BarList data={stats.byCategory} max={catMax} />
          </section>

          <section className="stat-section">
            <h2>지역별 정책 수</h2>
            <BarList data={stats.byRegion} max={regMax} />
          </section>

          <section className="stat-section">
            <h2>지원 대상별 정책 수</h2>
            <BarList data={stats.byTarget} max={tgtMax} />
          </section>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link className="load-more-btn" href="/">
          정책 찾으러 가기 →
        </Link>
      </div>
    </div>
  );
}
