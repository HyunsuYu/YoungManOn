"use client";

import { useState } from "react";
import type { PolicyFilter, PolicyTarget } from "@/lib/types";

const EXAMPLES = [
  "서울 사는 26살 취준생인데 월세 지원 찾고 있어",
  "경기도 대학생인데 받을 수 있는 장학금 알려줘",
  "30살 직장인, 소득 조건 없는 자산형성 지원",
];

interface Props {
  /** AI 가 해석한 조건을 필터에 적용 */
  onApply: (patch: Partial<PolicyFilter>, summary: string) => void;
}

/** 자연어로 조건을 말하면 Claude 가 필터로 바꿔주는 검색바 */
export default function AiSearchBar({ onApply }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const run = async (q: string) => {
    const text = q.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetch("/api/nl-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "검색에 실패했습니다.");

      onApply(
        {
          age: data.age ?? undefined,
          region: data.region ?? "전체",
          category: data.category ?? "전체",
          target: (data.target as PolicyTarget) ?? undefined,
          keyword: data.keyword || undefined,
          incomeFreeOnly: !!data.incomeFreeOnly,
          hideExpired: true,
        },
        data.summary ?? ""
      );
      setSummary(data.summary ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="ai-search" aria-label="AI 맞춤 검색">
      <div className="ai-search-head">
        <span className="ai-badge">AI 맞춤 검색</span>
        <p>조건을 문장으로 말해보세요. 알아서 필터를 잡아드립니다.</p>
      </div>

      <form
        className="ai-search-form"
        onSubmit={(e) => {
          e.preventDefault();
          run(query);
        }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 서울 사는 26살 취준생인데 월세 지원 찾고 있어"
          aria-label="자연어 검색어"
          maxLength={500}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !query.trim()}>
          {loading ? "분석 중…" : "검색"}
        </button>
      </form>

      {!summary && !error && (
        <div className="ai-examples">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="ai-example"
              onClick={() => {
                setQuery(ex);
                run(ex);
              }}
              disabled={loading}
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {summary && (
        <p className="ai-result" role="status">
          ✅ {summary}
        </p>
      )}
      {error && (
        <p className="ai-error" role="alert">
          ⚠️ {error}
        </p>
      )}
    </section>
  );
}
