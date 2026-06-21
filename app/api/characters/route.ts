// POST /api/characters  — 캐릭터 생성 (서버측 플랜/한도 검증)
// ---------------------------------------------------------------------------
//  클라 UI 게이트를 우회한 직접 호출을 막기 위해, 서버가 다시 확인한다:
//   1) 온체인 NFT 소유로 plan 산출 (진짜 소스 — DB 캐시 신뢰 안 함)
//   2) 보유 캐릭터 수 카운트
//   3) characterCreateGate 로 free 차단 + 플랜별 한도 강제
//   4) 통과 시에만 insert
import { NextResponse } from "next/server"
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc"
import { supabase } from "@/lib/supabase"
import { draftToRow } from "@/lib/characters"
import { currentPlanFromPasses, getOwnedPasses } from "@/lib/pass"
import { characterCreateGate } from "@/lib/plans"
import type { CharacterDraft } from "@/lib/types"

export const runtime = "nodejs"

const NETWORK =
  (process.env.NEXT_PUBLIC_SUI_NETWORK as "mainnet" | "testnet") ?? "mainnet"
const suiClient = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl(NETWORK),
  network: NETWORK,
})

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail("invalid json", 400)
  }

  const { ownerId, draft } = (body ?? {}) as {
    ownerId?: unknown
    draft?: unknown
  }
  if (typeof ownerId !== "string" || !ownerId || !draft) {
    return fail("ownerId/draft are required.", 400)
  }

  // 1) 온체인 plan (NFT 소유 = 진짜 소스)
  let plan
  try {
    const passes = await getOwnedPasses(suiClient, ownerId)
    plan = currentPlanFromPasses(passes)
  } catch (e) {
    console.error("[api/characters] plan 조회 실패:", e)
    return fail("Failed to verify your plan. Please try again shortly.", 502)
  }

  // 2) 보유 캐릭터 수
  const { count, error: countErr } = await supabase
    .from("characters")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
  if (countErr) return fail(countErr.message, 500)

  // 3) 게이트 (free 차단 + 한도 강제)
  const gate = characterCreateGate(plan, count ?? 0)
  if (!gate.allowed) {
    return fail(gate.reason ?? "Unable to create character.", 403)
  }

  // 4) insert
  const { data, error } = await supabase
    .from("characters")
    .insert({
      ...draftToRow(draft as CharacterDraft),
      owner_id: ownerId,
      is_official: false,
    })
    .select("id")
    .single()
  if (error) return fail(error.message, 500)

  return NextResponse.json({ id: String((data as { id: string }).id) })
}
