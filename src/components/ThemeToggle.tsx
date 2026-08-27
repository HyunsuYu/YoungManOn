"use client";

import { useEffect, useState } from "react";

const KEY = "youngon:theme";

/** 라이트/다크 테마 토글 (선택은 localStorage 에 저장, 미설정 시 시스템 설정 따름) */
export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      /* 무시 */
    }
    const isDark =
      stored === "dark" ||
      (stored !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {
      /* 무시 */
    }
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      title={dark ? "라이트 모드" : "다크 모드"}
    >
      {/* 마운트 전에는 서버/클라 동일한 중립 아이콘을 렌더해 hydration 불일치 방지 */}
      {!mounted ? "🌗" : dark ? "☀️" : "🌙"}
    </button>
  );
}
