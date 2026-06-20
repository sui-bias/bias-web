"use client"

import { useEffect, useState } from "react"
import { Plus, Search, Settings } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { ChatListItem, type ChatType } from "@/components/chat-list-item"
import Link from "next/link"
import { useCurrentUser } from "@/hooks/use-current-user"
import { getCharacter } from "@/lib/mock"
import { listMessages, listRoomsForUser } from "@/lib/rooms"
import { getUser } from "@/lib/users"

type ChatListRow = {
  roomId: string
  title: string
  preview: string
  time: string
  type: ChatType
  members?: string[]
  sortAt: number
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…`
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export default function ChatPage() {
  const { address } = useCurrentUser()
  const [chats, setChats] = useState<ChatListRow[]>([])
  const [loading, setLoading] = useState(true)

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
                  getCharacter(character.characterId)?.display_name ?? room.name
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
                      return (
                        getCharacter(p.characterId)?.display_name ?? "캐릭터"
                      )
                    }
                    if (p.address === address) return "나"
                    return (
                      userNameByAddress.get(p.address) ??
                      shortenAddress(p.address)
                    )
                  })
                : undefined

            return {
              roomId: room.id,
              title,
              preview: lastMessage?.text ?? "아직 메시지가 없습니다.",
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
              aria-label="Search friends"
              className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
            >
              <Search size={20} />
            </button>
            <Link
              href="/rooms/new"
              aria-label="그룹 방 만들기"
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

      <section className="border-t border-grey-200 p-4 dark:border-grey-800">
        <div className="text-sm font-semibold text-grey-900 dark:text-white">
          Messages
        </div>
        {address && !loading && chats.length > 0 && (
          <ul className="divide-y divide-grey-100">
            {chats.map((chat) => (
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
      </section>
    </div>
  )
}
