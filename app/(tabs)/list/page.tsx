import { Search, Settings, UserPlus } from "lucide-react"
import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { FriendListItem, type FriendKind } from "@/components/friend-list-item"

type FriendItem = {
  id: string
  name: string
  description?: string
  kind: FriendKind
}

const FRIENDS: FriendItem[] = [
  { id: "101", name: "Diana", kind: "user" },
  { id: "102", name: "Eric", kind: "user" },
  { id: "103", name: "Bob", kind: "character" },
  { id: "104", name: "Aria", description: "Online now", kind: "character" },
  { id: "105", name: "Brian", kind: "user" },
  { id: "106", name: "Luna", description: "New Character", kind: "character" },
]

const SORTED_FRIENDS = [...FRIENDS].sort((a, b) =>
  a.name.localeCompare(b.name, ["ko", "en"], { sensitivity: "base" })
)

export default function ListPage() {
  return (
    <div className="space-y-4 pt-6">
      <AppHeader
        left={
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-yellow-300 text-sm font-semibold text-grey-900">
              9
            </div>
            <p className="text-xl font-bold text-grey-900 dark:text-white">
              9oodam
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
              <UserPlus size={20} />
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
          Friends
        </div>
        <ul className="divide-y divide-grey-100 dark:divide-grey-800">
          {SORTED_FRIENDS.map((friend) => (
            <FriendListItem
              key={friend.id}
              name={friend.name}
              description={friend.description}
              kind={friend.kind}
              href={`/list/${friend.id}`}
            />
          ))}
        </ul>
      </section>
    </div>
  )
}
