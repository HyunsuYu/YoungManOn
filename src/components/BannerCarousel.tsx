"use client";

import { useCallback, useEffect, useState } from "react";

// 청년이 함께 알아두면 좋은 주요 정책 포털들. 각 배너는 해당 사이트로 바로가기 버튼 역할을 합니다.
interface Banner {
  tag: string;
  title: string;
  site: string;
  desc: string;
  href: string;
  emoji: string;
  gradient: string;
}

const BANNERS: Banner[] = [
  {
    tag: "통합검색 · 필수",
    title: "전국 청년정책을 한 번에",
    site: "온통청년",
    desc: "중앙정부·전국 지자체 청년정책 통합검색",
    href: "https://www.youthcenter.go.kr",
    emoji: "🔎",
    gradient: "linear-gradient(135deg, #3b5bfd 0%, #5b7bff 100%)",
  },
  {
    tag: "지원금 · 필수",
    title: "내가 받을 수 있는 지원금 찾기",
    site: "정부24 혜택알리미",
    desc: "정부·지자체 지원금과 생활 혜택 맞춤 안내",
    href: "https://www.gov.kr",
    emoji: "💳",
    gradient: "linear-gradient(135deg, #0ca678 0%, #12b886 100%)",
  },
  {
    tag: "복지 · 필수",
    title: "복지·생활·금융 지원 한눈에",
    site: "복지로",
    desc: "복지·생활·금융·취약청년 지원 서비스",
    href: "https://www.bokjiro.go.kr",
    emoji: "🤝",
    gradient: "linear-gradient(135deg, #2f9e44 0%, #51cf66 100%)",
  },
  {
    tag: "일자리 · 필수",
    title: "취업·직업훈련·구직지원금",
    site: "고용24",
    desc: "취업지원, 직업훈련, 일경험, 구직지원금",
    href: "https://www.work24.go.kr",
    emoji: "💼",
    gradient: "linear-gradient(135deg, #4263eb 0%, #7048e8 100%)",
  },
  {
    tag: "주거 · 권장",
    title: "청년 주거·전월세 지원",
    site: "마이홈포털",
    desc: "공공임대, 월세, 전세·주거비 지원 정보",
    href: "https://www.myhome.go.kr",
    emoji: "🏠",
    gradient: "linear-gradient(135deg, #f76707 0%, #ff922b 100%)",
  },
  {
    tag: "창업 · 권장",
    title: "청년 창업 지원사업·공고",
    site: "K-Startup",
    desc: "청년·예비창업자 지원사업과 모집 공고",
    href: "https://www.k-startup.go.kr",
    emoji: "🚀",
    gradient: "linear-gradient(135deg, #7048e8 0%, #9c36b5 100%)",
  },
];

const INTERVAL = 5000;

export default function BannerCarousel() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const count = BANNERS.length;

  const go = useCallback(
    (n: number) => setIndex(((n % count) + count) % count),
    [count]
  );

  useEffect(() => {
    if (!playing || count <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL);
    return () => clearInterval(t);
  }, [playing, count]);

  return (
    <section
      className="banner"
      aria-roledescription="carousel"
      aria-label="청년정책 바로가기 배너"
    >
      <div className="banner-viewport">
        <div
          className="banner-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {BANNERS.map((b, i) => (
            <a
              className="banner-slide"
              key={b.href}
              href={b.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: b.gradient }}
              aria-hidden={i !== index}
              tabIndex={i === index ? 0 : -1}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count} — ${b.site} 바로가기`}
            >
              <div className="banner-content">
                <span className="banner-kicker">청년ON 추천 · {b.tag}</span>
                <h2 className="banner-title">{b.title}</h2>
                <p className="banner-desc">
                  <b>{b.site}</b> — {b.desc}
                </p>
                <span className="banner-cta">바로가기 →</span>
              </div>
              <div className="banner-emoji" aria-hidden="true">
                {b.emoji}
              </div>
            </a>
          ))}
        </div>

        <button
          type="button"
          className="banner-arrow prev"
          onClick={() => go(index - 1)}
          aria-label="이전 배너"
        >
          ‹
        </button>
        <button
          type="button"
          className="banner-arrow next"
          onClick={() => go(index + 1)}
          aria-label="다음 배너"
        >
          ›
        </button>

        <div className="banner-controls">
          <div className="banner-dots" role="tablist" aria-label="배너 선택">
            {BANNERS.map((b, i) => (
              <button
                key={b.href}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`${i + 1}번 배너로 이동`}
                className={`banner-dot ${i === index ? "on" : ""}`}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="banner-playpause"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "자동 넘김 정지" : "자동 넘김 재생"}
          >
            {playing ? "❙❙" : "▶"}
          </button>
        </div>
      </div>
    </section>
  );
}
