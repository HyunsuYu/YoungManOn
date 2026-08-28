"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBookmarks } from "@/components/BookmarkProvider";
import PolicyCard from "@/components/PolicyCard";
import PolicyDetailPanel from "@/components/PolicyDetailPanel";
import { filterPolicies } from "@/lib/filter";
import type { Policy } from "@/lib/types";

export default function BookmarksPage() {
  const { bookmarks, ready } = useBookmarks();
  const [selected, setSelected] = useState<Policy | null>(null);

  // 마감 임박순 정렬 (필터 없이)
  const sorted = useMemo(
    () => filterPolicies(bookmarks, {}, "deadline"),
    [bookmarks]
  );

  return (
    <div className="simple-page">
      <div className="simple-head">
        <h1>⭐ 관심 정책</h1>
        <p>관심 등록한 정책을 모아봅니다. (이 기기에만 저장됩니다)</p>
      </div>

      {!ready ? (
        <div className="state-box">불러오는 중…</div>
      ) : sorted.length === 0 ? (
        <div className="state-box">
          <span className="emoji">☆</span>
          아직 관심 등록한 정책이 없어요.
          <div style={{ marginTop: 16 }}>
            <Link className="load-more-btn" href="/">
              정책 찾으러 가기
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="page-info" style={{ marginBottom: 16 }}>
            총 {sorted.length}건
          </p>
          {selected && (
            <PolicyDetailPanel
              summary={selected}
              onClose={() => setSelected(null)}
            />
          )}
          <div className="policy-grid">
            {sorted.map((p) => (
              <PolicyCard
                key={p.id}
                policy={p}
                onSelect={setSelected}
                active={selected?.id === p.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
