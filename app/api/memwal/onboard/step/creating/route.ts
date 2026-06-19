import { NextResponse } from "next/server"
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client"
import {
  fail,
  getUserOrThrow,
  requireEnv,
  setMemwalStep,
  toStatusPayload,
  verifyStateProof,
} from "../../_lib"

export const runtime = "nodejs"

const NETWORK =
  (process.env.NEXT_PUBLIC_SUI_NETWORK as "mainnet" | "testnet") ?? "mainnet"
const suiClient = new SuiClient({ url: getFullnodeUrl(NETWORK) })

async function findExistingMemwalAccountId(
  ownerAddress: string,
  packageId: string
): Promise<string | null> {
  const structType = `${packageId}::account::MemWalAccount`
  let cursor: string | null | undefined = null

  while (true) {
    const page = await suiClient.getOwnedObjects({
      owner: ownerAddress,
      filter: { StructType: structType },
      options: { showType: true },
      cursor: cursor ?? undefined,
      limit: 50,
    })

    const found = page.data.find((item) => item.data?.objectId)?.data?.objectId
    if (found) return found
    if (!page.hasNextPage) return null
    cursor = page.nextCursor
  }
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail("invalid json", 400)
  }

  try {
    const { address } = await verifyStateProof(body)
    const user = await getUserOrThrow(address)
    const packageId = requireEnv("MEMWAL_PACKAGE_ID")
    const requestedAccountId =
      typeof (body as { accountId?: unknown })?.accountId === "string"
        ? (body as { accountId: string }).accountId.trim()
        : ""

    if (user.memwal_step === "done" && user.memwal_account_id) {
      return NextResponse.json({
        ...toStatusPayload(user),
        needsCreate: false,
      })
    }

    // 프론트에서 createAccount 완료 후 accountId를 보내면 여기서 DB를 동기화한다.
    if (requestedAccountId) {
      const updated = await setMemwalStep(address, "delegate_memwal", {
        accountId: requestedAccountId,
        memwalDelegatePubKey: user.memwal_delegate_pubkey,
        sealDelegatePubKey: user.seal_delegate_pubkey,
        error: null,
      })
      return NextResponse.json({
        ...toStatusPayload(updated),
        needsCreate: false,
      })
    }

    // create 전에 먼저 체인에서 기존 MemWalAccount를 조회한다.
    const existingAccountId =
      user.memwal_account_id ??
      (await findExistingMemwalAccountId(address, packageId))
    if (existingAccountId) {
      const updated = await setMemwalStep(address, "delegate_memwal", {
        accountId: existingAccountId,
        memwalDelegatePubKey: user.memwal_delegate_pubkey,
        sealDelegatePubKey: user.seal_delegate_pubkey,
        error: null,
      })
      return NextResponse.json({
        ...toStatusPayload(updated),
        needsCreate: false,
      })
    }

    const updated = await setMemwalStep(address, "creating", {
      accountId: user.memwal_account_id,
      memwalDelegatePubKey: user.memwal_delegate_pubkey,
      sealDelegatePubKey: user.seal_delegate_pubkey,
      error: null,
    })
    return NextResponse.json({
      ...toStatusPayload(updated),
      needsCreate: true,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "step update failed"
    return fail(message, 400)
  }
}
