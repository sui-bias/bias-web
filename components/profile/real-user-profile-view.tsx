"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, UserCheck, UserPlus, UserX } from "lucide-react"
import { useCurrentUser } from "@/hooks/use-current-user"
import { addFriend, isFriend } from "@/lib/friends"
import { getOrCreateDirectUserRoom } from "@/lib/rooms"
import { getUser, type UserRow } from "@/lib/users"
import { ProfileActionButton, ProfileHero } from "./profile-hero"

// 실제 사람 유저 Profile (Supabase users). Chat(유저-유저 방) + Add friend(일방향).
export function RealUserProfileView({ address }: { address: string }) {
  const router = useRouter()
  const { address: myAddress } = useCurrentUser()
  const [user, setUser] = useState<UserRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [friend, setFriend] = useState(false)
  const [adding, setAdding] = useState(false)
  const [chatBusy, setChatBusy] = useState(false)
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
      setNotice("Connect your wallet to add friends.")
      return
    }
    setAdding(true)
    try {
      await addFriend(myAddress, address)
      setFriend(true)
    } catch {
      setNotice("Failed to add friend.")
    } finally {
      setAdding(false)
    }
  }

  async function startChat() {
    if (!myAddress) {
      setNotice("Connect your wallet to chat.")
      return
    }
    if (!user) return
    setChatBusy(true)
    try {
      const roomId = await getOrCreateDirectUserRoom(
        myAddress,
        address,
        user.display_name
      )
      router.push(`/rooms/${roomId}`)
    } catch {
      setChatBusy(false)
      setNotice("Failed to open chat.")
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
          User not found.
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
            <ProfileActionButton icon={UserX} label="My profile" disabled />
          ) : (
            <>
              <ProfileActionButton
                icon={MessageCircle}
                label={chatBusy ? "Opening…" : "Chat"}
                primary
                onClick={startChat}
              />
              {friend ? (
                <ProfileActionButton icon={UserCheck} label="Friends" disabled />
              ) : (
                <ProfileActionButton
                  icon={UserPlus}
                  label={adding ? "Adding…" : "Add friend"}
                  onClick={handleAdd}
                />
              )}
            </>
          )
        }
      />

      <section className="space-y-3 p-4">
        {notice ? (
          <p className="text-center text-xs text-brand">{notice}</p>
        ) : null}
        <div className="rounded-xl bg-grey-100 px-3 py-2 text-xs text-grey-600 dark:bg-grey-800 dark:text-grey-300">
          <span className="font-semibold">Wallet</span> · {address.slice(0, 10)}…
          {address.slice(-6)}
        </div>
      </section>
    </div>
  )
}
