import { NextResponse } from "next/server"
import { requireEnv } from "../_lib"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({
    packageId: requireEnv("MEMWAL_PACKAGE_ID"),
    registryId: requireEnv("MEMWAL_REGISTRY_ID"),
    serverDelegatePubKey: requireEnv("SERVER_DELEGATE_PUBKEY"),
    serverSealDelegatePubKey: requireEnv("SERVER_SEAL_DELEGATE_PUBKEY"),
    network:
      (process.env.NEXT_PUBLIC_SUI_NETWORK as "mainnet" | "testnet") ??
      "mainnet",
  })
}

