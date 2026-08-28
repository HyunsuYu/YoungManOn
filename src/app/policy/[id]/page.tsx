import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchPolicyById } from "@/lib/youthApi";
import PolicyDetailView from "@/components/PolicyDetailView";

// 상세는 요청 시점에 단건 조회 (30분 캐시). 직접 링크/공유용으로 유지됩니다.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const policy = await fetchPolicyById(id);
  if (!policy) return { title: "정책을 찾을 수 없습니다 | 청년ON" };
  return { title: `${policy.title} | 청년ON`, description: policy.summary };
}

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const policy = await fetchPolicyById(id);
  if (!policy) notFound();

  return (
    <div className="detail-page">
      <div className="detail-inner">
        <Link href="/" className="back-link">
          ← 목록으로
        </Link>
        <PolicyDetailView policy={policy} />
      </div>
    </div>
  );
}
