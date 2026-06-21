import { NextResponse } from "next/server"
import {
  fail,
  getUserOrThrow,
  requireEnv,
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

  const { accountId } = (body ?? {}) as { accountId?: unknown }
  if (typeof accountId !== "string" || !accountId.trim()) {
    return fail("accountId is required.", 400)
  }

  try {
    const { address } = await verifyStateProof(body)
    const user = await getUserOrThrow(address)
    const memwalDelegatePubKey = requireEnv("SERVER_DELEGATE_PUBKEY")

    const updated = await setMemwalStep(address, "delegate_memwal", {
      accountId: accountId.trim(),
      memwalDelegatePubKey,
      sealDelegatePubKey: user.seal_delegate_pubkey,
      error: null,
    })
    return NextResponse.json(toStatusPayload(updated))
  } catch (error) {
    const message = error instanceof Error ? error.message : "step update failed"
    return fail(message, 400)
  }
}

