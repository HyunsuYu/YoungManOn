import Link from "next/link";
import type { Metadata } from "next";
import { getAllPolicies } from "@/lib/youthApi";
import { getMockPolicies } from "@/data/mockPolicies";
import { daysUntilDeadline, isExpired } from "@/lib/dday";
import type { Policy } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "청년정책 통계 | 청년ON",
  description: "분류·지역별 청년정책 분포와 마감 임박 현황을 한눈에.",
};

/** 배열을 key별로 세어 [key, count] 내림차순 배열로 */
function tally(items: string[]): [string, number][] {
  const m = new Map<string, number>();
  items.forEach((k) => m.set(k, (m.get(k) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function BarList({
  data,
  max,
}: {
  data: [string, number][];
  max: number;
}) {
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

export default async function StatsPage() {
  let policies: Policy[];
  try {
    policies = await getAllPolicies();
  } catch {
    policies = getMockPolicies();
  }

  const total = policies.length;
  const active = policies.filter((p) => !isExpired(p)).length;
  const closingSoon = policies.filter((p) => {
    const d = daysUntilDeadline(p);
    return d !== null && d >= 0 && d <= 7;
  }).length;
  const always = policies.filter((p) => daysUntilDeadline(p) === null).length;

  const byCategory = tally(policies.map((p) => p.category));
  const byRegion = tally(policies.map((p) => p.region));
  const byTarget = tally(policies.flatMap((p) => p.targets));

  const catMax = byCategory[0]?.[1] ?? 0;
  const regMax = byRegion[0]?.[1] ?? 0;
  const tgtMax = byTarget[0]?.[1] ?? 0;

  return (
    <div className="simple-page">
      <div className="simple-head">
        <h1>📊 청년정책 통계</h1>
        <p>온통청년에 등록된 전체 청년정책의 분포입니다.</p>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-num">{total.toLocaleString("ko-KR")}</span>
          <span className="stat-cap">전체 정책</span>
        </div>
        <div className="stat-card">
          <span className="stat-num accent">{active.toLocaleString("ko-KR")}</span>
          <span className="stat-cap">신청 가능</span>
        </div>
        <div className="stat-card">
          <span className="stat-num warn">{closingSoon.toLocaleString("ko-KR")}</span>
          <span className="stat-cap">7일 내 마감</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{always.toLocaleString("ko-KR")}</span>
          <span className="stat-cap">상시 접수</span>
        </div>
      </div>

      <section className="stat-section">
        <h2>분류별 정책 수</h2>
        <BarList data={byCategory} max={catMax} />
      </section>

      <section className="stat-section">
        <h2>지역별 정책 수</h2>
        <BarList data={byRegion} max={regMax} />
      </section>

      <section className="stat-section">
        <h2>지원 대상별 정책 수</h2>
        <BarList data={byTarget} max={tgtMax} />
      </section>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link className="load-more-btn" href="/">
          정책 찾으러 가기 →
        </Link>
      </div>
    </div>
  );
}
