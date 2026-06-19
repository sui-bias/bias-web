"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { MOCK_CHARACTERS } from "@/lib/mock"

const TILE_COLORS = [
  "from-violet-300 to-fuchsia-500",
  "from-sky-300 to-blue-500",
  "from-emerald-300 to-teal-500",
  "from-amber-300 to-orange-500",
]

// 탐색 탭: 다른 유저들이 만든 공개 캐릭터를 둘러본다.
// TODO(api): 현재는 mock 공개 캐릭터. 추후 Supabase 의 공개 user 캐릭터로 교체.
const PUBLIC_CHARACTERS = MOCK_CHARACTERS.filter(
  (c) => c.visibility === "public"
)

export default function ExplorePage() {
  const [keyword, setKeyword] = useState("")

  const results = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return PUBLIC_CHARACTERS
    return PUBLIC_CHARACTERS.filter((c) =>
      `${c.name} ${c.intro} ${c.genre ?? ""}`.toLowerCase().includes(q)
    )
  }, [keyword])

  return (
    <div className="space-y-4 pt-4 pb-6">
      <div className="px-4">
        <h1 className="mb-3 text-xl font-bold text-grey-900 dark:text-white">
          Explore
        </h1>
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-grey-500 dark:text-grey-400"
          />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="캐릭터 이름·성격·장르 검색"
            className="h-11 w-full rounded-xl border border-grey-200 bg-grey-100 pr-3 pl-10 text-sm text-grey-900 transition-colors outline-none focus:border-brand dark:border-grey-700 dark:bg-grey-800 dark:text-white"
          />
        </div>
      </div>

      <section className="px-1">
        {results.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-grey-500 dark:text-grey-400">
            검색 결과가 없습니다.
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-1">
            {results.map((character, index) => (
              <li key={character.id}>
                <Link
                  href={`/list/${character.id}`}
                  className="group relative block w-full overflow-hidden text-left"
                >
                  <div
                    className={`relative aspect-[3/4] bg-gradient-to-br ${
                      TILE_COLORS[index % TILE_COLORS.length]
                    }`}
                  >
                    {character.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={character.imageUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-2">
                      <p className="truncate text-xs font-semibold text-white">
                        {character.name}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
