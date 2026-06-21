import { NextResponse } from "next/server"
import { fromBase64 } from "@mysten/sui/utils"
import { verifyPersonalMessageSignature } from "@mysten/sui/verify"
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc"
import { getUser, updateMemwalState, type UserRow } from "@/lib/users"
import type { MemwalStep } from "@/lib/types"

const NETWORK =
  (process.env.NEXT_PUBLIC_SUI_NETWORK as "mainnet" | "testnet") ?? "mainnet"
const VERIFY_MAX_AGE_MS = 5 * 60_000

const verifyClient = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl(NETWORK),
  network: NETWORK,
})

type VerifyResult = { address: string }

function parseStateMessage(
  text: string
): { address: string; issuedAt: string } | null {
  const lines = text.split("\n")
  if (lines[0] !== "BIAS_MEMWAL_ONBOARD_STATE") return null

  const addressLine = lines.find((line) => line.startsWith("address:"))
  const issuedAtLine = lines.find((line) => line.startsWith("issuedAt:"))
  if (!addressLine || !issuedAtLine) return null

  const address = addressLine.slice("address:".length).trim()
  const issuedAt = issuedAtLine.slice("issuedAt:".length).trim()
  if (!address || !issuedAt) return null
  return { address, issuedAt }
}

export function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}

export async function verifyStateProof(body: unknown): Promise<VerifyResult> {
  const { bytes, signature } = (body ?? {}) as {
    bytes?: unknown
    signature?: unknown
  }
  if (typeof bytes !== "string" || typeof signature !== "string") {
    throw new Error("bytes/signature 가 필요합니다.")
  }

  const messageBytes = fromBase64(bytes)
  const parsed = parseStateMessage(new TextDecoder().decode(messageBytes))
  if (!parsed) throw new Error("메시지 형식이 올바르지 않습니다.")

  const issuedMs = Date.parse(parsed.issuedAt)
  const skew = Date.now() - issuedMs
  if (Number.isNaN(issuedMs) || skew > VERIFY_MAX_AGE_MS || skew < -60_000) {
    throw new Error("만료되었거나 유효하지 않은 요청입니다.")
  }

  await verifyPersonalMessageSignature(messageBytes, signature, {
    address: parsed.address,
    client: verifyClient,
  })

  return { address: parsed.address }
}

export async function getUserOrThrow(address: string): Promise<UserRow> {
  const user = await getUser(address)
  if (!user) throw new Error("유저를 찾을 수 없습니다.")
  return user
}

export async function setMemwalStep(
  address: string,
  step: MemwalStep,
  opts?: {
    accountId?: string
    memwalDelegatePubKey?: string
    sealDelegatePubKey?: string
    error?: string | null
  }
) {
  return updateMemwalState(address, {
    memwal_step: step,
    memwal_account_id: opts?.accountId,
    memwal_delegate_pubkey: opts?.memwalDelegatePubKey,
    seal_delegate_pubkey: opts?.sealDelegatePubKey,
    memwal_error: opts?.error ?? null,
  })
}

export function toStatusPayload(user: UserRow) {
  return {
    step: user.memwal_step ?? "pending",
    accountId: user.memwal_account_id ?? null,
    memwalDelegatePubKey: user.memwal_delegate_pubkey ?? null,
    sealDelegatePubKey: user.seal_delegate_pubkey ?? null,
    error: user.memwal_error ?? null,
  }
}

