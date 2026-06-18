import { Plus, Search, Settings } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { ChatListItem, type ChatType } from "@/components/chat-list-item"
import Link from "next/link"

const CHATS = [
  {
    id: "room-aria",
    title: "Aria",
    preview: "Are you free tonight?",
    time: "오후 9:42",
    type: "direct" as ChatType,
  },
  {
    id: "room-weekend",
    title: "Weekend Group",
    preview: "Let's pick a place!",
    time: "오후 8:10",
    type: "group" as ChatType,
    members: ["A", "B", "C", "D", "E"],
  },
  {
    id: "room-kai",
    title: "Kai",
    preview: "I sent you the summary.",
    time: "어제",
    type: "direct" as ChatType,
  },
]

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
              key={chat.id}
              title={chat.title}
              preview={chat.preview}
              time={chat.time}
              type={chat.type}
              members={chat.members}
              href={`/chat/${chat.id}`}
            />
          ))}
        </ul>
      </section>
    </div>
  )
}
