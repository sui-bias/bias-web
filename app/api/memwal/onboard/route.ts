import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({
    message: "Use split endpoints under /api/memwal/onboard/*",
    endpoints: {
      config: "/api/memwal/onboard/config",
      status: "/api/memwal/onboard/status?address=0x...",
      creating: "/api/memwal/onboard/step/creating",
      delegateMemwal: "/api/memwal/onboard/step/delegate-memwal",
      delegateSeal: "/api/memwal/onboard/step/delegate-seal",
      done: "/api/memwal/onboard/step/done",
      failed: "/api/memwal/onboard/step/failed",
    },
  })
}
