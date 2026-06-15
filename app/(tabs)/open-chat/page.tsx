"use client"

import { Search } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

const PAGE_SIZE = 8

type OpenCharacter = {
  id: number
  name: string
  mood: string
}

const OPEN_CHARACTERS: OpenCharacter[] = Array.from(
  { length: 96 },
  (_, index) => {
    const names = ["Aria", "Luna", "Kai", "Nova", "Sol", "Echo", "Mina", "Theo"]
    const moods = [
      "Late-night vibes",
      "Chill talk",
      "Music fan",
      "Coffee break",
    ]

    return {
      id: index + 1,
      name: `${names[index % names.length]} ${index + 1}`,
      mood: moods[index % moods.length],
    }
  }
)

async function getOpenCharacters(
  keyword: string,
  offset: number,
  limit: number
) {
  await new Promise((resolve) => setTimeout(resolve, 120))

  const normalizedKeyword = keyword.trim().toLowerCase()
  const filtered = normalizedKeyword
    ? OPEN_CHARACTERS.filter((item) =>
        `${item.name} ${item.mood}`.toLowerCase().includes(normalizedKeyword)
      )
    : OPEN_CHARACTERS

  const items = filtered.slice(offset, offset + limit)
  const hasMore = offset + limit < filtered.length

  return { items, hasMore }
}

export default function OpenChatPage() {
  const [keyword, setKeyword] = useState("")
  const [items, setItems] = useState<OpenCharacter[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const tileBackgrounds = useMemo(
    () => [
      "from-violet-300 to-fuchsia-500",
      "from-sky-300 to-blue-500",
      "from-emerald-300 to-teal-500",
      "from-amber-300 to-orange-500",
    ],
    []
  )

  useEffect(() => {
    let cancelled = false

    const loadFirstPage = async () => {
      setIsLoading(true)
      const next = await getOpenCharacters(keyword, 0, PAGE_SIZE)
      if (cancelled) return

      setItems(next.items)
      setHasMore(next.hasMore)
      setIsLoading(false)
    }

    void loadFirstPage()

    return () => {
      cancelled = true
    }
  }, [keyword])

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    const next = await getOpenCharacters(keyword, items.length, PAGE_SIZE)
    setItems((prev) => [...prev, ...next.items])
    setHasMore(next.hasMore)
    setIsLoading(false)
  }, [hasMore, isLoading, items.length, keyword])

  useEffect(() => {
    const target = sentinelRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore()
        }
      },
      { rootMargin: "240px 0px" }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [loadMore])

  return (
    <div className="space-y-4 pt-4 pb-6">
      <div className="px-4 backdrop-blur supports-[backdrop-filter]:bg-white/85 dark:supports-[backdrop-filter]:bg-grey-900/85">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-grey-500 dark:text-grey-400"
          />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search"
            className="h-11 w-full rounded-xl border border-grey-200 bg-grey-100 pr-3 pl-10 text-sm text-grey-900 transition-colors outline-none focus:border-brand dark:border-grey-700 dark:bg-grey-800 dark:text-white"
          />
        </div>
      </div>

      <section className="px-1">
        {items.length === 0 && !isLoading ? (
          <div className="px-3 py-10 text-center text-sm text-grey-500 dark:text-grey-400">
            검색 결과가 없습니다.
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-1">
            {items.map((item, index) => (
              <li key={item.id}>
                <Link
                  href={`/open-chat/${item.id}`}
                  className="group relative block w-full overflow-hidden text-left"
                >
                  <div
                    className={`aspect-[3/4] bg-gradient-to-br ${
                      tileBackgrounds[index % tileBackgrounds.length]
                    }`}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-2">
                    <p className="truncate text-xs font-semibold text-white">
                      {item.name}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div ref={sentinelRef} className="h-6" />

        {isLoading ? (
          <p className="pt-2 text-center text-xs text-grey-500 dark:text-grey-400">
            불러오는 중...
          </p>
        ) : null}
      </section>
    </div>
  )
}
