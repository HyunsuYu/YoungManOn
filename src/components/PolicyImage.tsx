"use client";

import { useEffect, useRef, useState } from "react";
import type { Policy } from "@/lib/types";

// 사용자가 추후 제공할 공통 플레이스홀더 이미지 경로 (public/ 에 넣어주세요)
const PLACEHOLDER = "/placeholder-policy.png";

// 플레이스홀더 존재 여부를 세션당 한 번만 확인해 모든 카드가 공유합니다.
// (파일이 없을 때 카드마다 깨진 이미지 요청이 반복되는 것을 방지)
let placeholderCheck: Promise<boolean> | null = null;
function checkPlaceholder(): Promise<boolean> {
  if (!placeholderCheck) {
    placeholderCheck = new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = PLACEHOLDER;
    });
  }
  return placeholderCheck;
}

const CATEGORY_STYLE: Record<string, { emoji: string; bg: string }> = {
  일자리: { emoji: "💼", bg: "linear-gradient(135deg,#4263eb,#748ffc)" },
  주거: { emoji: "🏠", bg: "linear-gradient(135deg,#f76707,#ffa94d)" },
  교육: { emoji: "🎓", bg: "linear-gradient(135deg,#0ca678,#38d9a9)" },
  "복지·문화": { emoji: "🤝", bg: "linear-gradient(135deg,#7048e8,#b197fc)" },
  "참여·권리": { emoji: "🗳️", bg: "linear-gradient(135deg,#1098ad,#3bc9db)" },
  기타: { emoji: "📌", bg: "linear-gradient(135deg,#495057,#868e96)" },
};

/**
 * 공고 대표 이미지. imageUrl 이 있으면 사용, 없으면 플레이스홀더 이미지,
 * 그마저 없으면(로드 실패) 분류색 그라데이션 + 이모지로 대체합니다.
 */
export default function PolicyImage({ policy }: { policy: Policy }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const src = policy.imageUrl || PLACEHOLDER;
  const style = CATEGORY_STYLE[policy.category] ?? CATEGORY_STYLE["기타"];

  useEffect(() => {
    let alive = true;
    // 하이드레이션 전에 이미 실패한 경우 onError 가 놓치므로 마운트 시 재확인
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) {
      setFailed(true);
      return;
    }
    // 공고 자체 이미지가 없어 플레이스홀더를 쓰는 경우, 파일 유무를 미리 확인
    if (!policy.imageUrl) {
      checkPlaceholder().then((ok) => {
        if (alive && !ok) setFailed(true);
      });
    }
    return () => {
      alive = false;
    };
  }, [src, policy.imageUrl]);

  if (failed) {
    return (
      <div className="card-image fallback" style={{ background: style.bg }}>
        <span className="fallback-emoji" aria-hidden="true">
          {style.emoji}
        </span>
        <span className="fallback-label">{policy.category}</span>
      </div>
    );
  }

  return (
    <div className="card-image">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
