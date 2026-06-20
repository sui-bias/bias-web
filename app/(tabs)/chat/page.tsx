"use client"

import { useMemo, useState } from "react"
import { Plus, Search, Settings, X } from "lucide-react"
import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { ChatListItem, type ChatType } from "@/components/chat-list-item"
import { PROVIDED_CHARACTERS } from "@/lib/provided-characters"

const CHATS: Array<{
  roomId: string
  title: string
  preview: string
  time: string
  type: ChatType
  members?: string[]
}> = PROVIDED_CHARACTERS.map((character) => ({
  roomId: character.id,
  title: character.name,
  preview: character.firstMessage,
  time: "now",
  type: "direct",
}))

export default function ChatPage() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")

  const chats = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return CHATS
    return CHATS.filter((c) => c.title.toLowerCase().includes(q))
  }, [query])

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
            placeholder="Search by character name"
            className="h-10 w-full rounded-xl border border-grey-200 bg-grey-100 px-3 text-sm text-grey-900 outline-none focus:border-brand dark:border-grey-700 dark:bg-grey-800 dark:text-white"
          />
        </div>
      ) : null}

      <section className="border-t border-grey-200 p-4 dark:border-grey-800">
        <div className="text-sm font-semibold text-grey-900 dark:text-white">
          Messages
        </div>
        {chats.length === 0 ? (
          <p className="py-6 text-center text-sm text-grey-500 dark:text-grey-400">
            No characters found.
          </p>
        ) : (
          <ul className="divide-y divide-grey-100">
            {chats.map((chat) => (
              <ChatListItem
                key={chat.roomId}
                title={chat.title}
                preview={chat.preview}
                time={chat.time}
                type={chat.type}
                members={chat.members}
                href={`/chat/${chat.roomId}`}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
