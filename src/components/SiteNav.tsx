"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBookmarks } from "./BookmarkProvider";
import ThemeToggle from "./ThemeToggle";

const MENU = [
  { href: "/", label: "정책 찾기" },
  { href: "/stats", label: "통계" },
  { href: "/about", label: "소개" },
  { href: "/bookmarks", label: "관심목록" },
];

export default function SiteNav() {
  const pathname = usePathname();
  const { bookmarks, ready } = useBookmarks();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="site-nav">
      <div className="site-nav-inner">
        <Link
          href="/"
          className="brand"
          aria-label="청년ON 홈"
          onClick={(e) => {
            // 이미 홈이고 필터(쿼리)가 걸려 있으면, 상태까지 초기화된 첫 화면으로
            if (pathname === "/" && window.location.search) {
              e.preventDefault();
              window.location.assign("/");
            }
          }}
        >
          <span className="brand-mark" aria-hidden="true">
            ⏻
          </span>
          <span className="brand-text">
            <span className="brand-name">
              청년<b>ON</b>
            </span>
            <span className="brand-sub">청년정책 큐레이터</span>
          </span>
        </Link>

        <nav className="nav-menu" aria-label="주요 메뉴">
          {MENU.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={isActive(m.href) ? "on" : ""}
              aria-current={isActive(m.href) ? "page" : undefined}
            >
              {m.label}
              {m.href === "/bookmarks" && ready && bookmarks.length > 0 && (
                <span className="nav-badge">{bookmarks.length}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="nav-util">
          <Link href="/" className="nav-icon" aria-label="정책 검색">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
