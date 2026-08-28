"use client";

import { useEffect, useRef, useState } from "react";
import type { Policy } from "@/lib/types";
import { logoFor } from "@/lib/logo";

// 공고 자체 이미지가 없을 때 쓰는 공통 플레이스홀더 (public/ 에 넣어주세요)
const PLACEHOLDER = "/placeholder-policy.png";

// 플레이스홀더 존재 여부를 세션당 한 번만 확인해 모든 카드가 공유합니다.
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
 * 카드 대표 이미지. 우선순위:
 *   ① 공고 자체 이미지(imageUrl)
 *   ② 캐시된 기관 로고 (public/logos, 외부 요청 없음)
 *   ③ 공통 플레이스홀더 이미지
 *   ④ 분류색 그라데이션 + 이모지
 */
export default function PolicyImage({ policy }: { policy: Policy }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [placeholderMissing, setPlaceholderMissing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const style = CATEGORY_STYLE[policy.category] ?? CATEGORY_STYLE["기타"];
  const logo = logoFailed ? null : logoFor(policy.url);
  const photo = policy.imageUrl && !imgFailed ? policy.imageUrl : null;

  // 플레이스홀더를 쓸 상황이면 파일 유무를 미리 확인
  useEffect(() => {
    if (photo || logo) return;
    let alive = true;
    checkPlaceholder().then((ok) => {
      if (alive && !ok) setPlaceholderMissing(true);
    });
    return () => {
      alive = false;
    };
  }, [photo, logo]);

  // 하이드레이션 전에 실패한 경우 onError 를 놓치므로 마운트 시 재확인
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) {
      if (photo) setImgFailed(true);
      else if (logo) setLogoFailed(true);
      else setPlaceholderMissing(true);
    }
  }, [photo, logo]);

  // ① 공고 자체 이미지
  if (photo) {
    return (
      <div className="card-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={photo}
          alt=""
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  // ② 캐시된 기관 로고
  //   파비콘은 작은 정사각 이미지라 그대로 16:9 로 늘리면 깨지므로,
  //   같은 로고를 꽉 채워 크롭·블러 처리한 배경 위에 선명한 로고를 얹습니다.
  if (logo) {
    return (
      <div className="card-image logo-mode">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo-backdrop" src={logo} alt="" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          className="card-logo"
          src={logo}
          alt=""
          loading="lazy"
          onError={() => setLogoFailed(true)}
        />
      </div>
    );
  }

  // ③ 공통 플레이스홀더
  if (!placeholderMissing) {
    return (
      <div className="card-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={PLACEHOLDER}
          alt=""
          loading="lazy"
          onError={() => setPlaceholderMissing(true)}
        />
      </div>
    );
  }

  // ④ 분류색 대체 비주얼
  return (
    <div className="card-image fallback" style={{ background: style.bg }}>
      <span className="fallback-emoji" aria-hidden="true">
        {style.emoji}
      </span>
      <span className="fallback-label">{policy.category}</span>
    </div>
  );
}
