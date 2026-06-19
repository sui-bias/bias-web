"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Search, UserCheck, UserPlus } from "lucide-react"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { AppHeader } from "@/components/app-header"
import { addFriend, searchUsers } from "@/lib/friends"
import type { UserRow } from "@/lib/users"

export default function FriendSearchPage() {
  const account = useCurrentAccount()
  const myAddress = account?.address

  const [keyword, setKeyword] = useState("")
  const [results, setResults] = useState<UserRow[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault()
    const q = keyword.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    try {
      const rows = await searchUsers(q, myAddress)
      setResults(rows)
    } catch {
      setError("검색에 실패했습니다.")
    } finally {
      setSearched(true)
      setLoading(false)
    }
  }

  async function handleAdd(address: string) {
    if (!myAddress) {
      setError("친구 추가는 지갑 연결 후 가능합니다.")
      return
    }
    setError(null)
    try {
      await addFriend(myAddress, address)
      setAdded((prev) => new Set(prev).add(address))
    } catch {
      // friendships 테이블 생성 전에는 여기로 떨어진다.
      setError("아직 친구 추가를 사용할 수 없습니다. (DB 준비 중)")
    }
  }

  return (
    <div className="space-y-4 pt-6">
      <AppHeader
        left={
          <Link
            href="/list"
            aria-label="친구 목록으로"
            className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
          >
            <ArrowLeft size={20} />
          </Link>
        }
        title="친구 추가"
      />

      <div className="px-4">
        <form onSubmit={handleSearch} className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-grey-500 dark:text-grey-400"
          />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="닉네임 또는 지갑 주소로 검색"
            className="h-11 w-full rounded-xl border border-grey-200 bg-grey-100 pr-3 pl-10 text-sm text-grey-900 outline-none focus:border-brand dark:border-grey-700 dark:bg-grey-800 dark:text-white"
          />
        </form>
        {error ? <p className="mt-2 text-xs text-brand">{error}</p> : null}
      </div>

      <section className="px-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-grey-500 dark:text-grey-400">
            검색 중...
          </p>
        ) : searched && results.length === 0 ? (
          <p className="py-8 text-center text-sm text-grey-500 dark:text-grey-400">
            일치하는 유저가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-grey-100 dark:divide-grey-800">
            {results.map((user) => {
              const isAdded = added.has(user.address)
              return (
                <li
                  key={user.address}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-grey-200 text-sm font-medium text-grey-700 dark:bg-grey-700 dark:text-grey-100">
                    {user.display_name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-grey-900 dark:text-white">
                      {user.display_name}
                    </p>
                    <p className="truncate text-xs text-grey-500 dark:text-grey-400">
                      @{user.username}
                    </p>
                  </div>
                  {isAdded ? (
                    <span className="flex items-center gap-1 rounded-lg border border-grey-200 px-3 py-1.5 text-xs font-semibold text-grey-500 dark:border-grey-700 dark:text-grey-400">
                      <UserCheck size={14} />
                      추가됨
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAdd(user.address)}
                      className="flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-opacity active:opacity-80"
                    >
                      <UserPlus size={14} />
                      친구 추가
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
