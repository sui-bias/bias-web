"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check } from "lucide-react"
import { useCurrentUser } from "@/hooks/use-current-user"
import { listMyCharacters } from "@/lib/characters"
import { listCharacterFriends } from "@/lib/character-friends"
import { listFriends } from "@/lib/friends"
import { createRoom } from "@/lib/rooms"
import type { Character, Participant } from "@/lib/types"
import type { UserRow } from "@/lib/users"
import { cn } from "@/lib/utils"

const MAX_INVITES = 2
type InviteOption =
  | {
      key: string
      kind: "user"
      display_name: string
      imageUrl?: string
      address: string
    }
  | {
      key: string
      kind: "character"
      display_name: string
      imageUrl?: string
      characterId: string
    }

export default function NewRoomPage() {
  const router = useRouter()
  const { address } = useCurrentUser()

  const [name, setName] = useState("")
  const [picked, setPicked] = useState<string[]>([])
  const [friends, setFriends] = useState<UserRow[]>([])
  const [myCharacters, setMyCharacters] = useState<Character[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!address) {
        if (!cancelled) {
          setFriends([])
          setMyCharacters([])
        }
        return
      }
      const [friendRows, characterRows, addedCharacterRows] = await Promise.all([
        listFriends(address),
        listMyCharacters(address),
        listCharacterFriends(address),
      ])
      if (!cancelled) {
        setFriends(friendRows)
        const uniqueCharacters = [...characterRows, ...addedCharacterRows].filter(
          (row, index, rows) => rows.findIndex((v) => v.id === row.id) === index
        )
        setMyCharacters(uniqueCharacters)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [address])

  const inviteOptions = useMemo<InviteOption[]>(() => {
    const userOptions: InviteOption[] = friends.map((f) => ({
      key: `user:${f.address}`,
      kind: "user",
      display_name: f.display_name,
      imageUrl: f.image_url ?? undefined,
      address: f.address,
    }))
    const characterOptions: InviteOption[] = myCharacters.map((c) => ({
      key: `character:${c.id}`,
      kind: "character",
      display_name: c.display_name,
      imageUrl: c.imageUrl,
      characterId: c.id,
    }))
    return [...userOptions, ...characterOptions].sort((a, b) =>
      a.display_name.localeCompare(b.display_name)
    )
  }, [friends, myCharacters])

  const pickedOptions = useMemo(
    () => inviteOptions.filter((option) => picked.includes(option.key)),
    [inviteOptions, picked]
  )

  function toggle(id: string) {
    setPicked((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < MAX_INVITES
          ? [...prev, id]
          : prev
    )
  }

  const canSubmit = Boolean(name.trim() && address && !saving)

  async function handleCreate() {
    if (!address) {
      setError("Connect your wallet to create a room.")
      return
    }
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const participants: Participant[] = [
        { type: "user", address },
        ...pickedOptions.map(
          (option): Participant =>
            option.kind === "user"
              ? {
                  type: "user",
                  address: option.address,
                }
              : {
                  type: "character",
                  characterId: option.characterId,
                  ownerAddress: address,
                }
        ),
      ]
      const roomType = pickedOptions.length === 1 ? "direct" : "group"
      const id = await createRoom({
        type: roomType,
        name: name.trim(),
        ownerAddress: address,
        participants,
      })
      router.push(`/rooms/${id}`)
    } catch {
      setError("Failed to create room.")
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-white dark:bg-grey-900">
      <header className="flex items-center gap-3 border-b border-grey-200 px-3 py-3 dark:border-grey-800">
        <Link
          href="/chat"
          aria-label="Back"
          className="flex size-9 items-center justify-center rounded-full text-grey-700 hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
        >
          <ArrowLeft size={20} />
        </Link>
        <p className="text-lg font-bold text-grey-900 dark:text-white">
          Create chat room
        </p>
      </header>

      <div className="flex-1 space-y-6 p-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-grey-600 dark:text-grey-300">
            Room name <span className="text-brand">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekend chat"
            maxLength={30}
            className="h-11 w-full rounded-xl border border-grey-200 bg-white px-3 text-sm text-grey-900 outline-none focus:border-brand dark:border-grey-700 dark:bg-grey-800 dark:text-white"
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-grey-600 dark:text-grey-300">
            Invite Friends & Characters{" "}
            <span className="text-grey-400">(max {MAX_INVITES})</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {inviteOptions.map((item) => {
              const on = picked.includes(item.key)
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggle(item.key)}
                  className={cn(
                    "relative overflow-hidden rounded-xl border-2 transition-all active:scale-95",
                    on ? "border-brand" : "border-grey-100"
                  )}
                >
                  <div className="relative aspect-square bg-gradient-to-br from-violet-300 to-indigo-500">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : null}
                    {on ? (
                      <div className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-brand">
                        <Check
                          size={12}
                          className="text-white"
                          strokeWidth={3}
                        />
                      </div>
                    ) : null}
                  </div>
                  <p className="truncate bg-white px-1 py-1 text-[11px] font-semibold text-grey-900 dark:bg-grey-800 dark:text-white">
                    {item.display_name}
                  </p>
                </button>
              )
            })}
          </div>
          {/* TODO: 캐릭터 자율 발화는 백엔드 멀티세션 나오면 연결 */}
        </div>

        {error ? <p className="text-xs text-brand">{error}</p> : null}
      </div>

      <div className="border-t border-grey-200 p-4 dark:border-grey-800">
        <button
          onClick={handleCreate}
          disabled={!canSubmit}
          className="h-12 w-full rounded-xl bg-brand text-sm font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-40"
        >
          {saving ? "Creating…" : "Create"}
        </button>
      </div>
    </div>
  )
}
