// POST /api/auth/wallet  — 지갑 서명 기반 로그인 API
// ---------------------------------------------------------------------------
//  body: { bytes: string(b64), signature: string }
//   1) 서명된 메시지(bytes)를 파싱해 address / issuedAt 추출
//   2) issuedAt 이 5분 이내인지 확인(재사용 방지)
//   3) 서명 검증 — 확장지갑(ed25519/secp) + Slush 웹지갑(zkLogin) 모두 지원.
//      address 옵션으로 "서명자 == 주장한 주소" 까지 강제.
//   4) users 테이블 조회. address 가 PK 라 주소당 정확히 1유저(1:1 unique).
//      없으면 isNew=true (프로필 작성 단계로 보냄).
import { NextResponse } from "next/server"
import { fromBase64 } from "@mysten/sui/utils"
import { verifyPersonalMessageSignature } from "@mysten/sui/verify"
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc"
import { getUser } from "@/lib/users"
import { LOGIN_MAX_AGE_MS, parseLoginMessage } from "@/lib/auth"

// 암호화 검증이 필요하므로 Node 런타임에서 실행.
export const runtime = "nodejs"

const NETWORK =
  (process.env.NEXT_PUBLIC_SUI_NETWORK as "mainnet" | "testnet") ?? "mainnet"

// zkLogin 서명 검증에 필요(현재 epoch 의 주소 매핑 확인).
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

  const { bytes, signature } = (body ?? {}) as {
    bytes?: unknown
    signature?: unknown
  }
  if (typeof bytes !== "string" || typeof signature !== "string") {
    return fail("bytes/signature 가 필요합니다.", 400)
  }

  // 1) 메시지 디코드 + 파싱
  let messageBytes: Uint8Array
  try {
    messageBytes = fromBase64(bytes)
  } catch {
    return fail("bytes 디코드 실패.", 400)
  }
  const parsed = parseLoginMessage(new TextDecoder().decode(messageBytes))
  if (!parsed) return fail("메시지 형식이 올바르지 않습니다.", 400)

  // 2) 재사용(replay) 방지: 발급 시각이 최근인지 확인
  const issuedMs = Date.parse(parsed.issuedAt)
  const skew = Date.now() - issuedMs
  if (Number.isNaN(issuedMs) || skew > LOGIN_MAX_AGE_MS || skew < -60_000) {
    return fail("만료되었거나 유효하지 않은 로그인 요청입니다.", 401)
  }

  // 3) 서명 검증 (서명자 주소가 메시지의 address 와 일치해야 통과)
  try {
    await verifyPersonalMessageSignature(messageBytes, signature, {
      address: parsed.address,
      client: suiClient,
    })
  } catch {
    return fail("서명 검증에 실패했습니다.", 401)
  }

  // 4) 1:1 유저 조회 (address = PK)
  const user = await getUser(parsed.address)
  return NextResponse.json({
    address: parsed.address,
    isNew: !user,
    user,
  })
}
