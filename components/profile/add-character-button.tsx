"use client"

import { useEffect, useMemo, useState } from "react"
import { UserCheck, UserPlus } from "lucide-react"
import { useCurrentUser } from "@/hooks/use-current-user"
import { addCharacterFriend, isCharacterFriend } from "@/lib/character-friends"
import { ProfileActionButton } from "./profile-hero"

export function AddCharacterButton({
  characterId,
  ownerId,
}: {
  characterId: string
  ownerId: string
}) {
  const { address } = useCurrentUser()
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState(false)

  const isMine = useMemo(
    () => Boolean(address && ownerId && address === ownerId),
    [address, ownerId]
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!address || isMine) {
        if (!cancelled) setAdded(false)
        return
      }
      const value = await isCharacterFriend(address, characterId)
      if (!cancelled) setAdded(value)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [address, characterId, isMine])

  async function add() {
    if (busy || added) return
    if (!address) {
      alert("Connect your wallet to continue.")
      return
    }
    setBusy(true)
    try {
      await addCharacterFriend(address, characterId)
      setAdded(true)
    } catch {
      alert("Failed to add character.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <ProfileActionButton
      icon={added ? UserCheck : UserPlus}
      label={isMine ? "My character" : added ? "Added" : busy ? "Adding…" : "Add"}
      disabled={isMine || added || busy}
      onClick={add}
    />
  )
}
