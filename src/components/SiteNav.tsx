"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBookmarks } from "./BookmarkProvider";

export default function SiteNav() {
  const pathname = usePathname();
  const { bookmarks, ready } = useBookmarks();
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="site-nav">
      <div className="site-nav-inner">
        <Link href="/" className="brand">
          청년<span>ON</span>
        </Link>
        <div className="nav-links">
          <Link href="/" className={active("/") ? "on" : ""}>
            정책 찾기
          </Link>
          <Link href="/stats" className={active("/stats") ? "on" : ""}>
            통계
          </Link>
          <Link href="/bookmarks" className={active("/bookmarks") ? "on" : ""}>
            관심목록
            {ready && bookmarks.length > 0 && (
              <span className="nav-badge">{bookmarks.length}</span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
