import { NextResponse } from "next/server"

function toSessionId(seed: string): number {
  // 32-bit FNV-1a hash, constrained to positive signed int range.
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) & 0x7fffffff
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      characterId?: string
      roomId?: string
      userAddress?: string
      character?: {
        name?: string
        display_name?: string
        age?: number
        job?: string
        nativeLanguage?: string
        narrative?: string
        background?: string
        family?: string
        mbti?: string
        height?: string
        traits?: string
        textingStyle?: string
        likes?: string[]
        dislikes?: string[]
        hidden?: string
        bannedTopics?: string[]
        firstSituation?: string
        affinityStart?: number
        ownerId?: string
        chatCharacterId?: string
        speechHabits?: string
      }
    }
    const characterId = body.characterId?.trim()
    const roomId = body.roomId?.trim()
    const userAddress = body.userAddress?.trim()

    if (!characterId) {
      return NextResponse.json(
        { error: "characterId is required" },
        { status: 400 }
      )
    }
    if (!roomId) {
      return NextResponse.json({ error: "roomId is required" }, { status: 400 })
    }
    if (!userAddress) {
      return NextResponse.json(
        { error: "userAddress is required" },
        { status: 400 }
      )
    }

    const namespace = `room:${roomId}:char:${characterId}:user:${userAddress}`
    const sessionId = toSessionId(namespace)
    return NextResponse.json({
      sessionId,
      messages: [],
      level: null,
      namespace,
      character: body.character ?? null,
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
