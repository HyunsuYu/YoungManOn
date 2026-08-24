// 정책 하나를 표현하는 공통 타입.
// 온통청년/공공데이터포털 API 응답을 이 형태로 "정규화(normalize)"해서 사용합니다.
// 화면·필터·D-Day 로직은 모두 이 타입에만 의존하므로,
// 데이터 소스가 바뀌어도 이 아래 코드는 손댈 필요가 없습니다.

export type PolicyTarget = "대학생" | "취업준비생" | "재직자" | "무직" | "제한없음";

export interface Policy {
  /** 정책 고유 ID (API의 정책번호 등) */
  id: string;
  /** 정책명 */
  title: string;
  /** 한 줄 요약 / 지원 내용 */
  summary: string;
  /** 분류 (예: 주거, 일자리, 금융/자산, 교육, 복지/문화, 참여/권리) */
  category: string;
  /** 주관 기관 (예: 서울특별시, 고용노동부) */
  provider: string;
  /** 지역 (광역 단위: 전국, 서울, 경기 ...) */
  region: string;
  /** 신청 가능 최소 나이 (없으면 null = 제한 없음) */
  minAge: number | null;
  /** 신청 가능 최대 나이 (없으면 null = 제한 없음) */
  maxAge: number | null;
  /** 소득 조건 설명 (표시용) */
  incomeCondition: string;
  /** 소득 조건 상한 (중위소득 %, 없으면 null = 무관) — 필터용 */
  incomeMaxPercent: number | null;
  /** 지원 대상 유형 */
  targets: PolicyTarget[];
  /** 신청 시작일 (ISO: YYYY-MM-DD, 상시/미정이면 null) */
  applyStart: string | null;
  /** 신청 마감일 (ISO: YYYY-MM-DD, 상시/미정이면 null) */
  applyEnd: string | null;
  /** 원문/신청 링크 */
  url: string;
  /** 태그 (검색·표시용) */
  tags: string[];
}

/** 사용자가 선택한 필터 조건 */
export interface PolicyFilter {
  age?: number;
  region?: string;
  /** 본인 소득 (중위소득 %) — 이 값 이하 조건의 정책을 통과 */
  incomePercent?: number;
  target?: PolicyTarget;
  category?: string;
  /** 제목/요약/태그 텍스트 검색 */
  keyword?: string;
  /** 마감이 지난 정책 숨기기 */
  hideExpired?: boolean;
}
