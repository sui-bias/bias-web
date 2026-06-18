import { Plus, Search, Settings } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { ChatListItem, type ChatType } from "@/components/chat-list-item"
import { PROVIDED_CHARACTERS } from "@/lib/provided-characters"
import Link from "next/link"

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
  time: "방금",
  type: "direct",
}))

export default function ChatPage() {
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
            <button
              aria-label="Add friend"
              className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
            >
              <Plus size={20} />
            </button>
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
        <ul className="divide-y divide-grey-100">
          {CHATS.map((chat) => (
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
      </section>
    </div>
  )
}
