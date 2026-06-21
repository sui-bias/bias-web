"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Settings, UserPlus, X } from "lucide-react"
import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { FriendListItem } from "@/components/friend-list-item"
import { useCurrentUser } from "@/hooks/use-current-user"
import { listMyCharacters } from "@/lib/characters"
import { listFriends } from "@/lib/friends"
import type { Character } from "@/lib/types"
import type { UserRow } from "@/lib/users"

export default function ListPage() {
  const { address, user, loading } = useCurrentUser()
  const displayName = user?.display_name ?? (loading ? "…" : "Guest")

  const [friends, setFriends] = useState<UserRow[]>([])
  const [myCharacters, setMyCharacters] = useState<Character[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")

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
      const [friendRows, characterRows] = await Promise.all([
        listFriends(address),
        listMyCharacters(address),
      ])
      if (!cancelled) {
        setFriends(friendRows)
        setMyCharacters(characterRows)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [address])

  const q = query.trim().toLowerCase()
  const listItems = useMemo(() => {
    const friendItems = friends.map((f) => ({
      key: `user:${f.address}`,
      display_name: f.display_name,
      intro: `@${f.username}`,
      imageUrl: f.image_url ?? undefined,
      kind: "user" as const,
      href: `/list/${f.address}`,
    }))
    const characterItems = myCharacters.map((c) => ({
      key: `character:${c.id}`,
      display_name: c.display_name,
      intro: c.intro,
      imageUrl: c.imageUrl,
      kind: "character" as const,
      href: `/list/${c.id}`,
    }))

    return [...friendItems, ...characterItems]
      .sort((a, b) => a.display_name.localeCompare(b.display_name))
      .filter((item) =>
        q ? item.display_name.toLowerCase().includes(q) : true
      )
  }, [friends, myCharacters, q])

  return (
    <div className="space-y-4 pt-6">
      <AppHeader
        left={
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center overflow-hidden rounded-xl bg-grey-200 text-sm font-semibold text-grey-500 dark:bg-grey-700 dark:text-grey-300">
              {user?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image_url}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                displayName.slice(0, 1)
              )}
            </div>
            <p className="text-xl font-bold text-grey-900 dark:text-white">
              {displayName}
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

      {searchOpen ? (
        <div className="px-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name"
            className="h-10 w-full rounded-xl border border-grey-200 bg-grey-100 px-3 text-sm text-grey-900 outline-none focus:border-brand dark:border-grey-700 dark:bg-grey-800 dark:text-white"
          />
        </div>
      ) : null}

      <section className="border-t border-grey-200 p-4 dark:border-grey-800">
        <div className="text-sm font-semibold text-grey-900 dark:text-white">
          {q ? "Results" : "Friends"}
        </div>
        <ul className="divide-y divide-grey-100 dark:divide-grey-800">
          {listItems.map((item) => (
            <FriendListItem
              key={item.key}
              display_name={item.display_name}
              intro={item.intro}
              imageUrl={item.imageUrl}
              kind={item.kind}
              href={item.href}
            />
          ))}
        </ul>
        {q && listItems.length === 0 ? (
          <p className="py-6 text-center text-sm text-grey-500 dark:text-grey-400">
            No results found.
          </p>
        ) : null}
      </section>
    </div>
  )
}
