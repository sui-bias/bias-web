import { Search, Settings, UserPlus } from "lucide-react"
import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { FriendListItem } from "@/components/friend-list-item"
import { FRIENDS } from "@/lib/mock"

const SORTED_FRIENDS = [...FRIENDS].sort((a, b) =>
  a.data.name.localeCompare(b.data.name, ["ko", "en"], { sensitivity: "base" })
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
              key={friend.data.id}
              name={friend.data.name}
              intro={friend.data.intro}
              imageUrl={friend.data.imageUrl}
              kind={friend.kind}
              href={`/list/${friend.data.id}`}
            />
          ))}
        </ul>
      </section>
    </div>
  )
}
