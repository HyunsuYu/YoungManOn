import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "서비스 소개 | 청년ON",
  description:
    "청년ON은 흩어진 정부·지자체 청년정책을 조건별로 모아 보여주는 맞춤형 정책 큐레이터입니다.",
};

export default function AboutPage() {
  return (
    <div className="simple-page">
      <div className="simple-head">
        <h1>💡 청년ON 소개</h1>
        <p>흩어진 청년 혜택을, 청년 친화적으로 한 곳에서.</p>
      </div>

      <section className="about-section">
        <h2>왜 만들었나요?</h2>
        <p>
          청년수당, 전월세 지원, 교통비 환급, 장학금… 청년을 위한 지원 정책은 많지만
          정부·지자체·기관에 <b>흩어져 있어 놓치기 쉽습니다.</b> 청년ON은 이렇게
          분산된 정보를 한데 모아, 내 조건(나이·거주지·소득·신분)에 맞는 정책만
          골라 보여주고 신청 마감일을 D-Day로 알려줍니다.
        </p>
      </section>

      <section className="about-section">
        <h2>주요 기능</h2>
        <ul className="about-list">
          <li>
            <b>맞춤 필터</b> — 나이·거주지·신분·분류·키워드로 원하는 정책만 탐색
          </li>
          <li>
            <b>D-Day 캘린더</b> — 신청 마감 임박순 정렬과 마감 임박 배너로 마감을 놓치지 않게
          </li>
          <li>
            <b>상세 정보</b> — 지원 내용·신청 방법·제출 서류·문의처까지 한 화면에서
          </li>
          <li>
            <b>관심 정책 저장</b> — 마음에 드는 정책을 북마크하고 내 프로필로 맞춤 필터
          </li>
          <li>
            <b>통계 대시보드</b> — 분류·지역·대상별 정책 분포를 한눈에
          </li>
        </ul>
      </section>

      <section className="about-section">
        <h2>데이터는 어디서 오나요?</h2>
        <p>
          모든 정책 데이터는{" "}
          <a
            href="https://www.youthcenter.go.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-link"
          >
            온통청년(youthcenter.go.kr)
          </a>{" "}
          청년정책 통합 오픈 API에서 실시간으로 가져옵니다. 접속 시 서버가 최신
          정책을 조회해, 별도의 수동 갱신 없이 항상 최신 정보를 제공합니다.
        </p>
      </section>

      <section className="about-section">
        <h2>어떻게 동작하나요?</h2>
        <ol className="about-steps">
          <li>브라우저가 페이지에 접속하면 서버가 온통청년 API를 호출합니다.</li>
          <li>받아온 정책을 표준 형식으로 가공하고, 조건에 맞게 필터·정렬합니다.</li>
          <li>브라우저는 서버-서버 통신을 거친 결과만 받으므로 CORS 제약이 없습니다.</li>
        </ol>
      </section>

      <section className="about-section muted">
        <p>
          청년ON은 대학 과제로 제작된 비영리 프로젝트입니다. 실제 신청·자격 요건은
          각 정책의 공식 페이지에서 반드시 확인해 주세요.
        </p>
      </section>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link className="load-more-btn" href="/">
          정책 찾으러 가기 →
        </Link>
      </div>
    </div>
  );
}
