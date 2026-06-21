"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { CharacterForm } from "@/components/character/character-form"
import { usePlan } from "@/components/plan-provider"
import { useCurrentUser } from "@/hooks/use-current-user"
import { listMyCharacters } from "@/lib/characters"
import { characterCreateGate } from "@/lib/plans"

export default function CharacterCreatePage() {
  const { plan, loading: planLoading } = usePlan()
  const { address } = useCurrentUser()
  const [count, setCount] = useState<number | null>(null)

  // 현재 보유 캐릭터 수(한도 강제용).
  useEffect(() => {
    if (!address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCount(0)
      return
    }
    listMyCharacters(address)
      .then((cs) => setCount(cs.length))
      .catch(() => setCount(0))
  }, [address])

  const ready = !planLoading && count !== null
  const gate = ready ? characterCreateGate(plan, count) : { allowed: true }

  return (
    <div className="space-y-4 pt-6">
      <AppHeader
        left={
          <Link
            href="/character"
            aria-label="Back to characters"
            className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
          >
            <ArrowLeft size={20} />
          </Link>
        }
        title="Create Character"
      />

      {ready && !gate.allowed && (
        <div className="mx-4 flex items-center justify-between gap-3 rounded-xl bg-brand/5 px-4 py-3">
          <p className="text-sm text-grey-700 dark:text-grey-200">
            {gate.reason}
          </p>
          {gate.needUpgrade && (
            <Link
              href="/pricing"
              className="shrink-0 text-sm font-semibold text-brand underline underline-offset-2"
            >
              요금제 보기 →
            </Link>
          )}
        </div>
      )}

      <CharacterForm
        mode="create"
        blockedReason={ready && !gate.allowed ? gate.reason : undefined}
        submitLabel={
          ready && gate.needUpgrade ? "Plus 플랜으로 업그레이드" : undefined
        }
      />
    </div>
  )
}
