import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "청년ON | 흩어진 청년 혜택을 한 곳에서",
  description:
    "나이·거주지·소득·신분에 맞는 정부·지자체 청년정책을 실시간으로 필터링해 보여주는 맞춤형 정책 큐레이터입니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
