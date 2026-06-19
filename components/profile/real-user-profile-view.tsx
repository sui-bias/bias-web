"use client"

import { useEffect, useState } from "react"
import { MessageCircle, UserPlus, UserX } from "lucide-react"
import { useCurrentUser } from "@/hooks/use-current-user"
import { addFriend, isFriend } from "@/lib/friends"
import { getUser, type UserRow } from "@/lib/users"
import { ProfileActionButton, ProfileHero } from "./profile-hero"

// 실제 사람 유저 프로필 (Supabase users). 친구 추가/1:1 채팅 토글.
export function RealUserProfileView({ address }: { address: string }) {
  const { address: myAddress } = useCurrentUser()
  const [user, setUser] = useState<UserRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [friend, setFriend] = useState(false)
  const [adding, setAdding] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const isMe = myAddress === address

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const u = await getUser(address)
      const f = myAddress && !isMe ? await isFriend(myAddress, address) : false
      if (cancelled) return
      setUser(u)
      setFriend(f)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [address, myAddress, isMe])

  async function handleAdd() {
    if (!myAddress) {
      setNotice("친구 추가는 지갑 연결 후 가능합니다.")
      return
    }
    setAdding(true)
    try {
      await addFriend(myAddress, address)
      setFriend(true)
    } catch {
      setNotice("친구 추가에 실패했습니다.")
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-grey-300 border-t-brand" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-3 p-6 text-center">
        <p className="text-sm text-grey-500 dark:text-grey-400">
          존재하지 않는 유저입니다.
        </p>
      </div>
    )
  }

  return (
    <div>
      <ProfileHero
        name={user.display_name}
        intro={`@${user.username}`}
        backHref="/list"
        actions={
          isMe ? (
            <ProfileActionButton icon={UserX} label="내 프로필" disabled />
          ) : friend ? (
            <ProfileActionButton
              icon={MessageCircle}
              label="1:1 채팅"
              primary
              // 유저 간 채팅 백엔드 미구현 → 준비중 안내
              onClick={() => setNotice("유저 간 1:1 채팅은 준비 중입니다.")}
            />
          ) : (
            <ProfileActionButton
              icon={UserPlus}
              label={adding ? "추가 중…" : "친구 추가"}
              primary
              onClick={handleAdd}
            />
          )
        }
      />

      <section className="space-y-3 p-4">
        {notice ? (
          <p className="text-center text-xs text-brand">{notice}</p>
        ) : null}
        <div className="rounded-xl bg-grey-100 px-3 py-2 text-xs text-grey-600 dark:bg-grey-800 dark:text-grey-300">
          <span className="font-semibold">지갑</span> · {address.slice(0, 10)}…
          {address.slice(-6)}
        </div>
      </section>
    </div>
  )
}
