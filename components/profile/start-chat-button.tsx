"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle } from "lucide-react"
import { useCurrentUser } from "@/hooks/use-current-user"
import { getOrCreateDirectRoom } from "@/lib/rooms"
import { ProfileActionButton } from "./profile-hero"

// 캐릭터 Chat 시작: 나+캐릭터의 direct 방을 찾거나 만들고 /rooms/{id} 로 이동.
export function StartChatButton({
  characterId,
  characterName,
}: {
  characterId: string
  characterName: string
}) {
  const router = useRouter()
  const { address } = useCurrentUser()
  const [busy, setBusy] = useState(false)

  async function start() {
    if (busy) return
    if (!address) {
      alert("Connect your wallet to continue.")
      return
    }
    setBusy(true)
    try {
      const roomId = await getOrCreateDirectRoom(
        address,
        characterId,
        characterName
      )
      router.push(`/rooms/${roomId}`)
    } catch {
      setBusy(false)
      alert("Failed to open chat.")
    }
  }

  return (
    <ProfileActionButton
      icon={MessageCircle}
      label={busy ? "Opening…" : "Chat"}
      onClick={start}
      primary
    />
  )
}
