"use client";

import type { Policy } from "@/lib/types";
import { useBookmarks } from "./BookmarkProvider";

/** 정책 관심(북마크) 토글 버튼 */
export default function BookmarkButton({
  policy,
  size = "sm",
}: {
  policy: Policy;
  size?: "sm" | "lg";
}) {
  const { isBookmarked, toggle, ready } = useBookmarks();
  const active = ready && isBookmarked(policy.id);

  return (
    <button
      type="button"
      className={`bookmark-btn ${size} ${active ? "active" : ""}`}
      aria-pressed={active}
      aria-label={active ? "관심 해제" : "관심 등록"}
      title={active ? "관심 해제" : "관심 등록"}
      onClick={(e) => {
        // 카드 전체가 링크인 경우 클릭 전파 방지
        e.preventDefault();
        e.stopPropagation();
        toggle(policy);
      }}
    >
      {active ? "★" : "☆"}
    </button>
  );
}
