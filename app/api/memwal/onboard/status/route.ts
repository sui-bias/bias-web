import { NextResponse } from "next/server"
import { getUser } from "@/lib/users"
import { fail, toStatusPayload } from "../_lib"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")?.trim()
  if (!address) return fail("address is required.", 400)

  const user = await getUser(address)
  if (!user) return fail("User not found.", 404)

  return NextResponse.json(toStatusPayload(user))
}

