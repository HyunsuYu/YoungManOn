"use client";

import { useEffect, useRef, useState } from "react";
import type { Policy, PolicyDetail } from "@/lib/types";
import PolicyDetailView from "./PolicyDetailView";

/**
 * 카드 클릭 시 목록 위에 펼쳐지는 인라인 상세 패널.
 * summary(목록 데이터)로 즉시 제목을 보여주고, 단건 API로 전체 상세를 불러옵니다.
 */
export default function PolicyDetailPanel({
  summary,
  onClose,
}: {
  summary: Policy;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<PolicyDetail | null>(null);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 선택된 정책이 바뀌면 상세를 새로 불러오고 패널을 화면에 보이게 스크롤
  useEffect(() => {
    let alive = true;
    setDetail(null);
    setError(false);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    (async () => {
      try {
        const res = await fetch(`/api/policies/${summary.id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (alive) setDetail(data);
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [summary.id]);

  return (
    <div className="detail-panel" ref={ref}>
      <button
        type="button"
        className="detail-panel-close"
        onClick={onClose}
        aria-label="상세 닫기"
      >
        ✕
      </button>

      {error ? (
        <div className="detail-panel-state">
          <p>상세 정보를 불러오지 못했습니다.</p>
        </div>
      ) : !detail ? (
        <div className="detail-panel-state">
          <span className="category-tag">{summary.category}</span>
          <h1 className="detail-panel-loading-title">{summary.title}</h1>
          <div className="spinner" />
          <p>상세 정보를 불러오는 중…</p>
        </div>
      ) : (
        <PolicyDetailView policy={detail} />
      )}
    </div>
  );
}
