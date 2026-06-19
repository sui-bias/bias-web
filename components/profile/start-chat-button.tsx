"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle } from "lucide-react"
import { useCurrentUser } from "@/hooks/use-current-user"
import { getOrCreateDirectRoom } from "@/lib/rooms"
import { ProfileActionButton } from "./profile-hero"

// 캐릭터 1:1 채팅 시작: 나+캐릭터의 direct 방을 찾거나 만들고 /rooms/{id} 로 이동.
export function StartChatButton({
  characterId,
  characterName,
  chatReady,
}: {
  characterId: string
  characterName: string
  chatReady: boolean
}) {
  const router = useRouter()
  const { address } = useCurrentUser()
  const [busy, setBusy] = useState(false)

  async function start() {
    if (!chatReady || busy) return
    if (!address) {
      alert("지갑 연결 후 이용할 수 있어요.")
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
      alert("채팅방을 여는 데 실패했어요.")
    }
  }

  return (
    <ProfileActionButton
      icon={MessageCircle}
      label={chatReady ? (busy ? "여는 중…" : "1:1 채팅") : "준비중"}
      disabled={!chatReady}
      onClick={start}
      primary
    />
  )
}
