import { ddayLabel, daysUntilDeadline } from "@/lib/dday";
import type { PolicyDetail } from "@/lib/types";
import BookmarkButton from "./BookmarkButton";

function ddayClass(p: PolicyDetail): string {
  const d = daysUntilDeadline(p);
  if (d === null) return "none";
  if (d < 0) return "expired";
  if (d <= 3) return "urgent";
  if (d <= 7) return "soon";
  return "normal";
}

function ageText(p: PolicyDetail): string {
  if (p.minAge == null && p.maxAge == null) return "나이 무관";
  if (p.minAge != null && p.maxAge != null) return `만 ${p.minAge}~${p.maxAge}세`;
  if (p.minAge != null) return `만 ${p.minAge}세 이상`;
  return `만 ${p.maxAge}세 이하`;
}

function Section({ title, body }: { title: string; body?: string }) {
  if (!body || !body.trim()) return null;
  return (
    <section className="detail-section">
      <h2>{title}</h2>
      <p className="detail-body">{body}</p>
    </section>
  );
}

/** 정책 상세 내용 (상세 페이지 / 인라인 패널 공용) */
export default function PolicyDetailView({ policy }: { policy: PolicyDetail }) {
  const applyEndText = policy.applyEnd ?? "상시 접수";

  return (
    <>
      <div className="detail-head">
        <div className="detail-head-top">
          <div className="detail-tags">
            <span className="category-tag">{policy.category}</span>
            <span className={`dday ${ddayClass(policy)}`}>{ddayLabel(policy)}</span>
          </div>
          <BookmarkButton policy={policy} size="lg" />
        </div>
        <h1>{policy.title}</h1>
        <p className="detail-summary">{policy.summary}</p>
      </div>

      <div className="detail-facts">
        <div className="fact">
          <span className="k">주관 기관</span>
          <span className="v">{policy.provider}</span>
        </div>
        <div className="fact">
          <span className="k">지역</span>
          <span className="v">{policy.region}</span>
        </div>
        <div className="fact">
          <span className="k">연령</span>
          <span className="v">{ageText(policy)}</span>
        </div>
        <div className="fact">
          <span className="k">소득 조건</span>
          <span className="v">{policy.incomeCondition}</span>
        </div>
        <div className="fact">
          <span className="k">신청 기간</span>
          <span className="v">{policy.applyPeriodText || applyEndText}</span>
        </div>
        {policy.businessPeriod && (
          <div className="fact">
            <span className="k">사업 기간</span>
            <span className="v">{policy.businessPeriod}</span>
          </div>
        )}
      </div>

      <Section title="지원 내용" body={policy.supportContent} />
      <Section title="신청 방법" body={policy.applyMethod} />
      <Section title="제출 서류" body={policy.documents} />
      <Section title="추가 자격 요건" body={policy.additionalQualification} />
      <Section title="심사 방법" body={policy.screening} />
      <Section title="기타 사항" body={policy.etcNotes} />

      {policy.tags.length > 0 && (
        <div className="detail-tag-row">
          {policy.tags.map((t) => (
            <span key={t} className="pill">
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="detail-actions">
        <a
          className="apply-btn"
          href={policy.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          공고 바로가기 →
        </a>
        {policy.refUrls.map((u, i) => (
          <a
            key={i}
            className="ref-btn"
            href={u}
            target="_blank"
            rel="noopener noreferrer"
          >
            참고 링크 {policy.refUrls.length > 1 ? i + 1 : ""}
          </a>
        ))}
      </div>
    </>
  );
}
