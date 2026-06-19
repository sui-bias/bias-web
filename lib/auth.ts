// 지갑 로그인(SIWE 스타일) 공용 모듈.
// 클라이언트가 이 포맷으로 메시지를 만들어 지갑 서명을 받고,
// 서버(/api/auth/wallet)가 같은 규칙으로 파싱·검증한다.

/** 서명 요청 만료 시간(재사용 공격 방지). */
export const LOGIN_MAX_AGE_MS = 5 * 60 * 1000 // 5분
const STATEMENT = "Sign in to Bias"

/** 사람이 읽을 수 있는 서명 메시지. address + issuedAt 을 본문에 포함한다. */
export function buildLoginMessage(address: string, issuedAt: string): string {
  return [STATEMENT, "", `Address: ${address}`, `Issued At: ${issuedAt}`].join(
    "\n"
  )
}

export interface ParsedLoginMessage {
  address: string
  issuedAt: string
}

/** 서버에서 서명된 메시지 본문을 다시 파싱. 형식이 어긋나면 null. */
export function parseLoginMessage(text: string): ParsedLoginMessage | null {
  const address = text.match(/^Address: (0x[0-9a-fA-F]{64})$/m)?.[1]
  const issuedAt = text.match(/^Issued At: (.+)$/m)?.[1]?.trim()
  if (!address || !issuedAt) return null
  return { address, issuedAt }
}
