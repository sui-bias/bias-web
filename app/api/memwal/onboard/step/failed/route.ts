import { NextResponse } from "next/server"
import {
  fail,
  getUserOrThrow,
  setMemwalStep,
  toStatusPayload,
  verifyStateProof,
} from "../../_lib"

export const runtime = "nodejs"

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail("invalid json", 400)
  }

  const { error, accountId } = (body ?? {}) as {
    error?: unknown
    accountId?: unknown
  }
  const errorMessage =
    typeof error === "string" && error.trim() ? error.trim() : "onboarding failed"
  const normalizedAccountId =
    typeof accountId === "string" && accountId.trim() ? accountId.trim() : undefined

  try {
    const { address } = await verifyStateProof(body)
    const user = await getUserOrThrow(address)

    const updated = await setMemwalStep(address, "failed", {
      accountId: normalizedAccountId ?? user.memwal_account_id,
      memwalDelegatePubKey: user.memwal_delegate_pubkey,
      sealDelegatePubKey: user.seal_delegate_pubkey,
      error: errorMessage,
    })
    return NextResponse.json(toStatusPayload(updated))
  } catch (e) {
    const message = e instanceof Error ? e.message : "step update failed"
    return fail(message, 400)
  }
}

