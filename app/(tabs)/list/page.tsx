"use client"

import { useEffect, useState } from "react"
import { Search, Settings, UserPlus } from "lucide-react"
import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { FriendListItem } from "@/components/friend-list-item"
import { MOCK_CHARACTERS } from "@/lib/mock"
import { useCurrentUser } from "@/hooks/use-current-user"
import { listFriends } from "@/lib/friends"
import type { UserRow } from "@/lib/users"

const CHARACTERS = [...MOCK_CHARACTERS].sort((a, b) =>
  a.name.localeCompare(b.name, ["ko", "en"], { sensitivity: "base" })
)

export default function ListPage() {
  const { address, user, loading } = useCurrentUser()
  const displayName = user?.display_name ?? (loading ? "…" : "게스트")

  const [friends, setFriends] = useState<UserRow[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const rows = address ? await listFriends(address) : []
      if (!cancelled) setFriends(rows)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [address])

  return (
    <div className="space-y-4 pt-6">
      <AppHeader
        left={
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-yellow-300 text-sm font-semibold text-grey-900">
              {displayName.slice(0, 1)}
            </div>
            <p className="text-xl font-bold text-grey-900 dark:text-white">
              {displayName}
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
              href="/list/search"
              aria-label="Add friend"
              className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
            >
              <UserPlus size={20} />
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

      {/* 친구 (실제 유저) */}
      <section className="border-t border-grey-200 p-4 dark:border-grey-800">
        <div className="text-sm font-semibold text-grey-900 dark:text-white">
          친구 {friends.length > 0 ? friends.length : ""}
        </div>
        {friends.length === 0 ? (
          <p className="py-3 text-xs text-grey-400 dark:text-grey-500">
            아직 친구가 없어요. 우측 상단 + 로 친구를 찾아보세요.
          </p>
        ) : (
          <ul className="divide-y divide-grey-100 dark:divide-grey-800">
            {friends.map((f) => (
              <FriendListItem
                key={f.address}
                name={f.display_name}
                intro={`@${f.username}`}
                kind="user"
                href={`/list/${f.address}`}
              />
            ))}
          </ul>
        )}
      </section>

      {/* 캐릭터 */}
      <section className="border-t border-grey-200 p-4 dark:border-grey-800">
        <div className="text-sm font-semibold text-grey-900 dark:text-white">
          캐릭터
        </div>
        <ul className="divide-y divide-grey-100 dark:divide-grey-800">
          {CHARACTERS.map((c) => (
            <FriendListItem
              key={c.id}
              name={c.name}
              intro={c.intro}
              imageUrl={c.imageUrl}
              kind="character"
              href={`/list/${c.id}`}
            />
          ))}
        </ul>
      </section>
    </div>
  )
}
