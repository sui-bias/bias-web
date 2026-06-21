"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Search, Settings, X } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { ChatListItem, type ChatType } from "@/components/chat-list-item"
import Link from "next/link"
import { useCurrentUser } from "@/hooks/use-current-user"
import { getCharacter as getDbCharacter } from "@/lib/characters"
import { listMessages, listRoomsForUser } from "@/lib/rooms"
import { getUser } from "@/lib/users"

type ChatListRow = {
  roomId: string
  title: string
  preview: string
  time: string
  type: ChatType
  members?: Array<{ name: string; imageUrl?: string }>
  sortAt: number
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…`
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""

  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )
  const startOfTarget = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )

  const diffDays = Math.floor(
    (startOfToday.getTime() - startOfTarget.getTime()) / (1000 * 60 * 60 * 24)
  )

  // 오늘
  if (diffDays === 0) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  // 어제
  if (diffDays === 1) {
    return "Yesterday"
  }

  // 그 이전
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`
}

export default function ChatPage() {
  const { address } = useCurrentUser()
  const [chats, setChats] = useState<ChatListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")

  const visibleChats = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chats
    return chats.filter((c) => c.title.toLowerCase().includes(q))
  }, [chats, query])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!address) {
        setChats([])
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const rooms = await listRoomsForUser(address)
        const characterIds = [
          ...new Set(
            rooms
              .flatMap((room) => room.participants)
              .flatMap((p) => (p.type === "character" ? [p.characterId] : []))
          ),
        ]
        const otherUserAddresses = [
          ...new Set(
            rooms
              .flatMap((room) => room.participants)
              .filter(
                (p): p is { type: "user"; address: string } =>
                  p.type === "user" && p.address !== address
              )
              .map((p) => p.address)
          ),
        ]

        const otherUsers = await Promise.all(
          otherUserAddresses.map((userAddress) => getUser(userAddress))
        )
        const userNameByAddress = new Map(
          otherUsers
            .filter((u): u is NonNullable<typeof u> => Boolean(u))
            .map((u) => [u.address, u.display_name])
        )
        const userImageByAddress = new Map(
          otherUsers
            .filter((u): u is NonNullable<typeof u> => Boolean(u))
            .map((u) => [u.address, u.image_url ?? undefined])
        )
        const characterRows = await Promise.all(
          characterIds.map((characterId) => getDbCharacter(characterId))
        )
        const characterById = new Map(
          characterRows
            .filter((c): c is NonNullable<typeof c> => Boolean(c))
            .map((c) => [c.id, c])
        )

        const rows = await Promise.all(
          rooms.map(async (room): Promise<ChatListRow> => {
            const messages = await listMessages(room.id)
            const lastMessage = messages.at(-1)

            const character = room.participants.find(
              (p) => p.type === "character"
            )
            const otherUser = room.participants.find(
              (p) => p.type === "user" && p.address !== address
            )

            let title = room.name
            if (room.type === "direct") {
              if (character?.type === "character") {
                title =
                  characterById.get(character.characterId)?.display_name ??
                  room.name
              } else if (otherUser?.type === "user") {
                title =
                  userNameByAddress.get(otherUser.address) ??
                  shortenAddress(otherUser.address)
              }
            }

            const members =
              room.type === "group"
                ? room.participants.map((p) => {
                    if (p.type === "character") {
                      const characterInfo = characterById.get(p.characterId)
                      return {
                        name: characterInfo?.display_name ?? "Character",
                        imageUrl: characterInfo?.imageUrl,
                      }
                    }
                    if (p.address === address) return { name: "You" }
                    return {
                      name:
                        userNameByAddress.get(p.address) ??
                        shortenAddress(p.address),
                      imageUrl: userImageByAddress.get(p.address),
                    }
                  })
                : (() => {
                    if (character?.type === "character") {
                      const characterInfo = characterById.get(
                        character.characterId
                      )
                      return [
                        {
                          name: characterInfo?.display_name ?? title,
                          imageUrl: characterInfo?.imageUrl,
                        },
                      ]
                    }
                    if (otherUser?.type === "user") {
                      return [
                        {
                          name:
                            userNameByAddress.get(otherUser.address) ??
                            shortenAddress(otherUser.address),
                          imageUrl: userImageByAddress.get(otherUser.address),
                        },
                      ]
                    }
                    return [{ name: title }]
                  })()

            return {
              roomId: room.id,
              title,
              preview: lastMessage?.text ?? "No messages yet.",
              time: formatTime(lastMessage?.createdAt ?? room.createdAt),
              type: room.type,
              members,
              sortAt: new Date(
                lastMessage?.createdAt ?? room.createdAt
              ).getTime(),
            }
          })
        )

        rows.sort((a, b) => b.sortAt - a.sortAt)

        if (!cancelled) {
          setChats(rows)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [address])

  return (
    <div className="space-y-4 pt-6">
      <AppHeader
        left={
          <div className="flex items-center gap-3">
            <p className="text-xl font-bold text-grey-900 dark:text-white">
              Chat
            </p>
          </div>
        }
        right={
          <div className="flex items-center gap-1">
            <button
              aria-label="Search characters"
              onClick={() => {
                setSearchOpen((v) => !v)
                setQuery("")
              }}
              className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
            >
              {searchOpen ? <X size={20} /> : <Search size={20} />}
            </button>
            <Link
              href="/rooms/new"
              aria-label="Create group room"
              className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
            >
              <Plus size={20} />
            </Link>
            <Link
              href="/settings"
              aria-label="Open settings"
              className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
            >
              <Settings size={20} />
            </Link>
          </div>
        }
      />

      {searchOpen ? (
        <div className="px-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title"
            className="h-10 w-full rounded-xl border border-grey-200 bg-grey-100 px-3 text-sm text-grey-900 outline-none focus:border-brand dark:border-grey-700 dark:bg-grey-800 dark:text-white"
          />
        </div>
      ) : null}

      <section className="border-t border-grey-200 p-4 dark:border-grey-800">
        <div className="text-sm font-semibold text-grey-900 dark:text-white">
          Messages
        </div>
        {address && !loading && visibleChats.length > 0 && (
          <ul className="divide-y divide-grey-100">
            {visibleChats.map((chat) => (
              <ChatListItem
                key={chat.roomId}
                title={chat.title}
                preview={chat.preview}
                time={chat.time}
                type={chat.type}
                members={chat.members}
                href={`/rooms/${chat.roomId}`}
              />
            ))}
          </ul>
        )}
        {query && visibleChats.length === 0 ? (
          <p className="py-6 text-center text-sm text-grey-500 dark:text-grey-400">
            No characters found.
          </p>
        ) : null}
      </section>
    </div>
  )
}
