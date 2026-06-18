import { NextResponse } from "next/server"

const BIAS_CHAT_BASE_URL =
  process.env.BIAS_CHAT_BASE_URL ?? "http://127.0.0.1:5001"

type BiasChatMessageResponse = {
  bubbles?: string[]
  emotion?: string
  closeness_delta?: number
  closeness_total?: number
  level?: {
    num: number
    name: string
    address: string
    tone: string
  }
}

function isBiasChatMessageResponse(
  value: unknown
): value is BiasChatMessageResponse {
  if (!value || typeof value !== "object") return false
  const maybe = value as BiasChatMessageResponse
  return Array.isArray(maybe.bubbles)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId?: number
      text?: string
    }

    const sessionId = body.sessionId
    const text = body.text?.trim()

    if (!Number.isInteger(sessionId)) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
    }
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 })
    }

    const upstream = await fetch(
      `${BIAS_CHAT_BASE_URL}/api/sessions/${sessionId}/message`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        cache: "no-store",
      }
    )

    const payload: unknown = await upstream.json()
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "failed to send message", detail: payload },
        { status: upstream.status }
      )
    }
    if (!isBiasChatMessageResponse(payload)) {
      return NextResponse.json(
        { error: "invalid upstream response: missing bubbles" },
        { status: 502 }
      )
    }

    // NOTE: memwal integration point.
    // This response can later be enriched with memwal write/read results while
    // keeping the client payload stable.
    return NextResponse.json({
      bubbles: payload.bubbles ?? [],
      emotion: payload.emotion ?? "neutral",
      closenessDelta: payload.closeness_delta ?? 0,
      closenessTotal: payload.closeness_total ?? 0,
      level: payload.level ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "failed to send message",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    )
  }
}
