import { NextResponse } from "next/server"
import { getUser } from "@/lib/users"
import { fail, toStatusPayload } from "../_lib"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")?.trim()
  if (!address) return fail("address 가 필요합니다.", 400)

  const user = await getUser(address)
  if (!user) return fail("유저를 찾을 수 없습니다.", 404)

  return NextResponse.json(toStatusPayload(user))
}

