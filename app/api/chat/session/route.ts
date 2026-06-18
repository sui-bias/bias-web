import { NextResponse } from "next/server"
import { toBiasChatCharacterId } from "@/lib/chat-character-map"

const BIAS_CHAT_BASE_URL =
  process.env.BIAS_CHAT_BASE_URL ?? "http://127.0.0.1:5001"

type BiasChatMessage = {
  id: number
  role: "user" | "assistant"
  content: string
  emotion: string | null
}

type BiasChatSessionResponse = {
  session?: { id?: number }
  messages?: BiasChatMessage[]
  level?: {
    num: number
    name: string
    address: string
    tone: string
  }
}

function isBiasChatSessionResponse(
  value: unknown
): value is BiasChatSessionResponse {
  if (!value || typeof value !== "object") return false
  const maybe = value as BiasChatSessionResponse
  return Boolean(maybe.session && typeof maybe.session.id === "number")
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { characterId?: string }
    const webCharacterId = body.characterId?.trim()

    if (!webCharacterId) {
      return NextResponse.json(
        { error: "characterId is required" },
        { status: 400 }
      )
    }

    const biasChatCharacterId = toBiasChatCharacterId(webCharacterId)
    if (!biasChatCharacterId) {
      return NextResponse.json(
        { error: "unsupported characterId" },
        { status: 400 }
      )
    }

    const upstream = await fetch(`${BIAS_CHAT_BASE_URL}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ character_id: biasChatCharacterId }),
      cache: "no-store",
    })

    const payload: unknown = await upstream.json()

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "failed to create chat session", detail: payload },
        { status: upstream.status }
      )
    }

    if (!isBiasChatSessionResponse(payload)) {
      return NextResponse.json(
        { error: "invalid upstream response: missing session id" },
        { status: 502 }
      )
    }
    const sessionId = payload.session?.id

    // NOTE: memwal integration point.
    // This route is the BFF boundary where session persistence can be switched
    // from bias-chat sqlite -> memwal without changing the client contract.
    return NextResponse.json({
      sessionId,
      messages: payload.messages ?? [],
      level: payload.level ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "failed to create chat session",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    )
  }
}
