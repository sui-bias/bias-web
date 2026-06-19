"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Sparkles } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { cn } from "@/lib/utils"
import { PROVIDED_CHARACTERS } from "@/lib/mock"
import { Button } from "@/components/ui/button"

const CARD_COLORS = [
  "from-violet-400 to-purple-600",
  "from-amber-400 to-orange-500",
  "from-slate-500 to-slate-700",
  "from-pink-400 to-rose-600",
  "from-indigo-400 to-blue-600",
  "from-emerald-400 to-teal-600",
]

export default function CharacterGatePage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)

  const selectedChar = PROVIDED_CHARACTERS.find((c) => c.id === selected)

  function handleStart() {
    if (!selectedChar?.chatCharacterId) return
    // 팀원 채팅 라우트: 방 id = provided 캐릭터 id
    router.push(`/chat/${selectedChar.chatCharacterId}`)
  }

  return (
    <div className="flex min-h-svh flex-col bg-white dark:bg-grey-900">
      {/* Header */}
      <AppHeader
        className="px-6 pt-8 pb-2"
        center={
          <>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-brand" />
              <span className="text-xs font-medium text-brand">
                Provided Characters
              </span>
            </div>
            <h1 className="mt-2 text-xl font-bold text-grey-900 dark:text-white">
              Pick a character
              <br />
              to start chatting
            </h1>
            {/* <p className="mt-1 text-sm text-grey-500">You can switch anytime</p> */}
          </>
        }
      />

      {/* Plus upgrade banner */}
      <div className="mx-6 mt-4 mb-2 flex items-center justify-between rounded-2xl bg-gradient-to-r from-brand/10 to-brand-light/60 px-4 py-3 dark:from-brand/20 dark:to-brand/5">
        <div>
          <p className="text-sm font-semibold text-brand">
            Want your own character?
          </p>
          <p className="text-xs text-grey-600 dark:text-grey-400">
            Create up to 2 characters with Plus
          </p>
        </div>
        <button className="flex-shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">
          Learn more
        </button>
      </div>

      {/* Character grid */}
      <div className="grid grid-cols-2 gap-3 px-4 py-4 pb-36">
        {PROVIDED_CHARACTERS.map((char, index) => {
          const isSelected = selected === char.id
          const chatReady = Boolean(char.chatCharacterId)
          return (
            <button
              key={char.id}
              onClick={() => chatReady && setSelected(char.id)}
              disabled={!chatReady}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-2xl border-2 text-left transition-all",
                chatReady ? "active:scale-95" : "cursor-not-allowed",
                isSelected ? "border-brand shadow-lg shadow-brand/20" : "border"
              )}
            >
              {/* Character image area */}
              <div
                className={cn(
                  "relative aspect-[3/4] w-full bg-gradient-to-br",
                  CARD_COLORS[index % CARD_COLORS.length]
                )}
              >
                {char.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={char.imageUrl}
                    alt=""
                    className={cn(
                      "size-full object-cover",
                      !chatReady && "opacity-60"
                    )}
                  />
                ) : null}
                {/* Genre badge */}
                {char.genre?.length ? (
                  <div className="absolute top-2 left-2 rounded-full bg-black/30 px-2 py-0.5 text-xs text-white">
                    {char.genre[0]}
                  </div>
                ) : null}
                {/* 준비중 (채팅 미지원) */}
                {!chatReady ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-grey-700">
                      준비중
                    </span>
                  </div>
                ) : null}
                {/* Selection check */}
                {isSelected && (
                  <div className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-brand">
                    <Check size={14} className="text-white" strokeWidth={2.5} />
                  </div>
                )}
              </div>

              {/* Character info */}
              <div
                className={cn(
                  "bg-white p-3 transition-colors dark:bg-grey-800"
                )}
              >
                <p className="text-sm font-bold text-grey-900 dark:text-white">
                  {char.display_name}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-grey-500 dark:text-grey-400">
                  {char.intro}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Bottom CTA */}
      <div className="fixed right-0 bottom-0 left-0 border-t border-grey-100 bg-white/90 px-6 pt-4 pb-8 backdrop-blur dark:border-grey-800 dark:bg-grey-900/90">
        <Button
          onClick={handleStart}
          disabled={!selected}
          size="xl"
          className="w-full"
        >
          {selected ? "Start chatting" : "Select a character"}
        </Button>
      </div>
    </div>
  )
}
