import { NextResponse } from "next/server";
import { fetchPolicyById } from "@/lib/youthApi";

// 카드 클릭 시 인라인 상세 패널에서 단건 상세를 불러오는 엔드포인트
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const policy = await fetchPolicyById(id);
    if (!policy) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(policy, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[/api/policies/[id]] 실패:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
