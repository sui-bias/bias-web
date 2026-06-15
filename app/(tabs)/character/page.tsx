import Link from "next/link"
import { Plus, Search } from "lucide-react"
import { AppHeader } from "@/components/app-header"

const MY_CHARACTERS = [
  {
    id: "haneul",
    name: "하늘",
    description: "다정하고 공감 잘해주는 친구 캐릭터",
    genre: "Healing",
    color: "from-violet-400 to-indigo-500",
  },
  {
    id: "mira",
    name: "미라",
    description: "차분하게 조언해주는 현실 조력자",
    genre: "Daily",
    color: "from-sky-400 to-cyan-500",
  },
  {
    id: "reo",
    name: "레오",
    description: "열정 넘치고 에너지 주는 동기부여형",
    genre: "Coach",
    color: "from-amber-400 to-orange-500",
  },
] as const

export default function CharacterPage() {
  return (
    <div className="space-y-4 pt-6">
      <AppHeader
        left={
          <div className="flex items-center gap-3">
            <p className="text-xl font-bold text-grey-900 dark:text-white">
              My Bias
            </p>
          </div>
        }
        right={
          <div className="flex items-center gap-1">
            <Link href="/character/create">
              <button
                aria-label="Add friend"
                className="flex size-9 items-center justify-center rounded-full bg-brand text-white transition-colors"
              >
                <Plus size={20} />
              </button>
            </Link>
          </div>
        }
      />

      <section className="grid grid-cols-2 gap-3 px-4 pb-6">
        {MY_CHARACTERS.map((character) => (
          <Link
            key={character.id}
            href={`/character/${character.id}`}
            className="overflow-hidden rounded-xl border border-grey-200 transition-transform active:scale-95 dark:border-grey-800"
          >
            <div
              className={`relative aspect-square bg-gradient-to-br ${character.color}`}
            >
              <span className="absolute top-2 left-2 rounded-full bg-black/35 px-2 py-0.5 text-[11px] font-medium text-white">
                {character.genre}
              </span>
            </div>
            <div className="bg-white p-3 dark:bg-grey-900">
              <p className="text-sm font-bold text-grey-900 dark:text-white">
                {character.name}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-grey-500 dark:text-grey-400">
                {character.description}
              </p>
            </div>
          </Link>
        ))}

        <Link
          href="/character/create"
          className="flex aspect-[3/4] flex-col items-center justify-center rounded-xl border border-dashed border-brand/40 bg-brand-lightest p-4 text-center transition-transform active:scale-95 dark:bg-brand/10"
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-brand/15 text-brand">
            <Plus size={20} />
          </div>
          <p className="mt-3 text-sm font-semibold text-brand">Create</p>
          <p className="mt-1 text-xs text-grey-600 dark:text-grey-300">
            새 캐릭터 만들기
          </p>
        </Link>
      </section>
    </div>
  )
}
