"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Sparkles } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { cn } from "@/lib/utils"

const PROVIDED_CHARACTERS = [
  {
    id: "aria",
    name: "Aria",
    desc: "Warm and empathetic — your caring friend",
    genre: "Slice of Life",
    color: "from-violet-400 to-purple-600",
  },
  {
    id: "kai",
    name: "Kai",
    desc: "Cool and straight-talking senior",
    genre: "School",
    color: "from-blue-400 to-cyan-600",
  },
  {
    id: "luna",
    name: "Luna",
    desc: "Mysterious and wise fantasy mage",
    genre: "Fantasy",
    color: "from-pink-400 to-rose-600",
  },
  {
    id: "sol",
    name: "Sol",
    desc: "Bright, energetic idol trainee",
    genre: "Idol/Ent",
    color: "from-amber-400 to-orange-500",
  },
  {
    id: "nova",
    name: "Nova",
    desc: "Strategic mind and gaming pro",
    genre: "Gaming",
    color: "from-green-400 to-teal-600",
  },
  {
    id: "echo",
    name: "Echo",
    desc: "Gentle healer who soothes your day",
    genre: "Healing",
    color: "from-teal-400 to-emerald-600",
  },
] as const

type CharId = (typeof PROVIDED_CHARACTERS)[number]["id"]

export default function CharacterGatePage() {
  const router = useRouter()
  const [selected, setSelected] = useState<CharId | null>(null)

  function handleStart() {
    if (!selected) return
    // TODO: start 1:1 chat with selected character
    router.push("/chat")
  }

  return (
    <div className="flex min-h-svh flex-col bg-white dark:bg-grey-900">
      {/* Header */}
      <AppHeader
        className="px-6 pt-10 pb-2"
        center={
          <>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-brand" />
              <span className="text-xs font-medium text-brand">
                Provided Characters
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-grey-900 dark:text-white">
              Pick a character
              <br />
              to start chatting
            </h1>
            <p className="mt-1 text-sm text-grey-500">You can switch anytime</p>
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
        {PROVIDED_CHARACTERS.map((char) => {
          const isSelected = selected === char.id
          return (
            <button
              key={char.id}
              onClick={() => setSelected(char.id)}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-2xl border-2 text-left transition-all active:scale-95",
                isSelected
                  ? "border-brand shadow-lg shadow-brand/20"
                  : "border-transparent"
              )}
            >
              {/* Character image area */}
              <div
                className={cn(
                  "aspect-[3/4] w-full bg-gradient-to-br",
                  char.color
                )}
              >
                {/* Genre badge */}
                <div className="absolute top-2 left-2 rounded-full bg-black/30 px-2 py-0.5 text-xs text-white">
                  {char.genre}
                </div>
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
                  "bg-white p-3 transition-colors dark:bg-grey-800",
                  isSelected && "bg-brand-lightest dark:bg-grey-800"
                )}
              >
                <p className="text-sm font-bold text-grey-900 dark:text-white">
                  {char.name}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-grey-500 dark:text-grey-400">
                  {char.desc}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Bottom CTA */}
      <div className="fixed right-0 bottom-0 left-0 border-t border-grey-100 bg-white/90 px-6 pt-4 pb-10 backdrop-blur dark:border-grey-800 dark:bg-grey-900/90">
        <button
          onClick={handleStart}
          disabled={!selected}
          className={cn(
            "flex h-14 w-full items-center justify-center rounded-xl text-base font-semibold text-white transition-opacity",
            selected
              ? "bg-brand active:opacity-80"
              : "bg-grey-300 dark:bg-grey-700"
          )}
        >
          {selected ? "Start chatting" : "Select a character"}
        </button>
      </div>
    </div>
  )
}
