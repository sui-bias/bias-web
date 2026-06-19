"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check } from "lucide-react"
import { useCurrentUser } from "@/hooks/use-current-user"
import { MOCK_CHARACTERS } from "@/lib/mock"
import { createRoom } from "@/lib/rooms"
import type { Participant } from "@/lib/types"
import { cn } from "@/lib/utils"

const MAX_CHARACTERS = 2

export default function NewRoomPage() {
  const router = useRouter()
  const { address } = useCurrentUser()

  const [name, setName] = useState("")
  const [picked, setPicked] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(id: string) {
    setPicked((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < MAX_CHARACTERS
          ? [...prev, id]
          : prev
    )
  }

  const canSubmit = Boolean(name.trim() && address && !saving)

  async function handleCreate() {
    if (!address) {
      setError("방 생성은 지갑 연결 후 가능합니다.")
      return
    }
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const participants: Participant[] = [
        { type: "user", address },
        ...picked.map(
          (characterId): Participant => ({
            type: "character",
            characterId,
            ownerAddress: address,
          })
        ),
      ]
      const id = await createRoom({
        type: "group",
        name: name.trim(),
        ownerAddress: address,
        participants,
      })
      router.push(`/rooms/${id}`)
    } catch {
      setError("방 생성에 실패했습니다.")
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-white dark:bg-grey-900">
      <header className="flex items-center gap-3 border-b border-grey-200 px-3 py-3 dark:border-grey-800">
        <Link
          href="/chat"
          aria-label="뒤로"
          className="flex size-9 items-center justify-center rounded-full text-grey-700 hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
        >
          <ArrowLeft size={20} />
        </Link>
        <p className="text-lg font-bold text-grey-900 dark:text-white">
          그룹 방 만들기
        </p>
      </header>

      <div className="flex-1 space-y-6 p-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-grey-600 dark:text-grey-300">
            방 이름 <span className="text-brand">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 주말 수다방"
            maxLength={30}
            className="h-11 w-full rounded-xl border border-grey-200 bg-white px-3 text-sm text-grey-900 outline-none focus:border-brand dark:border-grey-700 dark:bg-grey-800 dark:text-white"
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-grey-600 dark:text-grey-300">
            캐릭터 초대 <span className="text-grey-400">(최대 {MAX_CHARACTERS})</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {MOCK_CHARACTERS.map((c) => {
              const on = picked.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={cn(
                    "relative overflow-hidden rounded-xl border-2 transition-all active:scale-95",
                    on ? "border-brand" : "border-transparent"
                  )}
                >
                  <div className="relative aspect-square bg-gradient-to-br from-violet-300 to-indigo-500">
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.imageUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : null}
                    {on ? (
                      <div className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-brand">
                        <Check size={12} className="text-white" strokeWidth={3} />
                      </div>
                    ) : null}
                  </div>
                  <p className="truncate bg-white px-1 py-1 text-[11px] font-semibold text-grey-900 dark:bg-grey-800 dark:text-white">
                    {c.display_name}
                  </p>
                </button>
              )
            })}
          </div>
          {/* TODO: 캐릭터 자율 발화는 백엔드 멀티세션 나오면 연결 */}
        </div>

        {error ? <p className="text-xs text-brand">{error}</p> : null}
      </div>

      <div className="border-t border-grey-200 p-4 dark:border-grey-800">
        <button
          onClick={handleCreate}
          disabled={!canSubmit}
          className="h-12 w-full rounded-xl bg-brand text-sm font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-40"
        >
          {saving ? "만드는 중…" : "그룹 방 만들기"}
        </button>
      </div>
    </div>
  )
}
