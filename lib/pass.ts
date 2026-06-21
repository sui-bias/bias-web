import type { SuiJsonRpcClient } from "@mysten/sui/jsonRpc"
import { Plan, planByTier } from "./plans"
import { PASS_TYPE, SUBSCRIPTION_PKG } from "./subscription"

// 온체인 MembershipPass 1개를 파싱한 형태.
export interface OwnedPass {
  id: string
  tier: number
  plan: Plan
  issuedMs: number
  expiresMs: number
  expired: boolean
}

// 마켓에 등록된 활성 Listing 1건.
export interface MarketListing {
  listingId: string
  passId: string
  seller: string
  tier: number
  plan: Plan
  expiresMs: number
  priceMist: bigint
}

type PassFields = { tier: number; issued_ms: string; expires_ms: string }

/** 연결된 지갑이 보유한 MembershipPass 들을 조회·파싱. 만료 포함 전체. */
export async function getOwnedPasses(
  client: SuiJsonRpcClient,
  address: string,
  nowMs: number = Date.now()
): Promise<OwnedPass[]> {
  if (!SUBSCRIPTION_PKG || !address) return []

  const passes: OwnedPass[] = []
  let cursor: string | null | undefined = null
  // 페이지네이션: 보유 Pass 가 많을 일은 없지만 안전하게 순회.
  do {
    const page = await client.getOwnedObjects({
      owner: address,
      filter: { StructType: PASS_TYPE },
      options: { showContent: true },
      cursor,
    })
    for (const item of page.data) {
      const content = item.data?.content
      if (!content || content.dataType !== "moveObject") continue
      const f = content.fields as unknown as PassFields
      const expiresMs = Number(f.expires_ms)
      passes.push({
        id: item.data!.objectId,
        tier: Number(f.tier),
        plan: planByTier(Number(f.tier)),
        issuedMs: Number(f.issued_ms),
        expiresMs,
        expired: nowMs >= expiresMs,
      })
    }
    cursor = page.hasNextPage ? page.nextCursor : null
  } while (cursor)

  return passes
}

/** 보유 Pass 중 미만료 최고 tier 를 현재 plan 으로. 없으면 free. */
export function currentPlanFromPasses(
  passes: OwnedPass[],
  nowMs: number = Date.now()
): Plan {
  const active = passes.filter((p) => nowMs < p.expiresMs)
  if (active.length === 0) return "free"
  const top = active.reduce((a, b) => (b.tier > a.tier ? b : a))
  return top.plan
}

/** 보유 Pass 중 "대표" 1건(미만료 최고 tier 우선, 없으면 최근 만료). plan 관리 UI 용. */
export function primaryPass(
  passes: OwnedPass[],
  nowMs: number = Date.now()
): OwnedPass | null {
  if (passes.length === 0) return null
  const active = passes.filter((p) => nowMs < p.expiresMs)
  const pool = active.length > 0 ? active : passes
  return pool.reduce((a, b) => {
    if (b.tier !== a.tier) return b.tier > a.tier ? b : a
    return b.expiresMs > a.expiresMs ? b : a
  })
}

type ListedJson = {
  listing_id: string
  pass_id: string
  seller: string
  tier: number
  expires_ms: string
  price: string
}

/**
 * 마켓 활성 Listing 조회. 인덱서 없이 Listed/Sold/Delisted 이벤트를 재생해
 * 아직 살아있는 listing 만 재구성한다(데모 규모용).
 */
export async function getActiveListings(
  client: SuiJsonRpcClient
): Promise<MarketListing[]> {
  if (!SUBSCRIPTION_PKG) return []

  const closed = new Set<string>()
  const listed = new Map<string, MarketListing>()

  for (const name of ["Sold", "Delisted"] as const) {
    await collectEvents(client, name, (json) => {
      closed.add((json as { listing_id: string }).listing_id)
    })
  }
  await collectEvents(client, "Listed", (json) => {
    const j = json as ListedJson
    listed.set(j.listing_id, {
      listingId: j.listing_id,
      passId: j.pass_id,
      seller: j.seller,
      tier: Number(j.tier),
      plan: planByTier(Number(j.tier)),
      expiresMs: Number(j.expires_ms),
      priceMist: BigInt(j.price),
    })
  })

  return [...listed.values()].filter((l) => !closed.has(l.listingId))
}

async function collectEvents(
  client: SuiJsonRpcClient,
  eventName: string,
  onEach: (json: unknown) => void
): Promise<void> {
  let cursor: { txDigest: string; eventSeq: string } | null | undefined = null
  do {
    const page = await client.queryEvents({
      query: { MoveEventType: `${SUBSCRIPTION_PKG}::subscription::${eventName}` },
      cursor,
      limit: 50,
    })
    for (const e of page.data) onEach(e.parsedJson)
    cursor = page.hasNextPage ? page.nextCursor : null
  } while (cursor)
}
