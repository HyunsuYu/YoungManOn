import type { Metadata } from "next";
import "./globals.css";
import { BookmarkProvider } from "@/components/BookmarkProvider";
import SiteNav from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "청년ON | 흩어진 청년 혜택을 한 곳에서",
  description:
    "나이·거주지·소득·신분에 맞는 정부·지자체 청년정책을 실시간으로 필터링해 보여주는 맞춤형 정책 큐레이터입니다.",
};

// 렌더 전에 저장된 테마를 적용해 다크모드 깜빡임(FOUC)을 방지하는 인라인 스크립트
const themeScript = `(function(){try{var t=localStorage.getItem('youngon:theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          본문 바로가기
        </a>
        <BookmarkProvider>
          <SiteNav />
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
        </BookmarkProvider>
      </body>
    </html>
  );
}
