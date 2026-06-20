"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Loader2, Check, Store } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { usePlan } from "@/components/plan-provider"
import { usePassActions } from "@/hooks/use-pass-actions"
import { PaidPlan, PAID_PLANS, PLANS } from "@/lib/plans"
import {
  buildMintTx,
  buildRenewTx,
  buildUpgradeTx,
  extractPassId,
  PRICE_MIST,
  SubscriptionConfigured,
} from "@/lib/subscription"
import { cacheSubscription } from "@/lib/users"
import { cn } from "@/lib/utils"

function suiLabel(mist: bigint) {
  return `${Number(mist) / 1e9} SUI`
}
function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

type ActionKind = "mint" | "renew" | "upgrade" | "lower" | "current"

export default function PricingPage() {
  const router = useRouter()
  const { account, execute } = usePassActions()
  const { plan, passes, primary, refresh } = usePlan()
  const [busy, setBusy] = useState<PaidPlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeTier = primary && !primary.expired ? primary.tier : 0

  /** 각 플랜 카드가 취할 액션을 결정. */
  function resolveAction(p: PaidPlan): ActionKind {
    const t = PLANS[p].tier
    // 동일 tier Pass 보유(만료 포함) → 새 NFT mint 대신 갱신.
    if (passes.some((x) => x.tier === t)) return "renew"
    if (activeTier === 0) return "mint"
    if (t > activeTier) return "upgrade"
    return "lower" // 보유보다 낮은 tier → 비활성
  }

  async function handle(p: PaidPlan) {
    if (!account) {
      setError("지갑을 먼저 연결해주세요.")
      return
    }
    setError(null)
    setBusy(p)
    try {
      const kind = resolveAction(p)
      let changes
      if (kind === "renew") {
        const target = passes.find((x) => x.tier === PLANS[p].tier)!
        changes = await execute(buildRenewTx(target.id, p))
      } else if (kind === "upgrade") {
        changes = await execute(
          buildUpgradeTx(primary!.id, primary!.plan as PaidPlan, p)
        )
      } else {
        changes = await execute(buildMintTx(p))
      }

      const passId = extractPassId(changes) ?? primary?.id ?? ""
      // 캐시 동기화(실패해도 온체인이 진짜 소스라 치명적 아님).
      try {
        await cacheSubscription(account.address, p, passId)
      } catch (e) {
        console.error("[pricing] cache error:", e)
      }
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리에 실패했습니다.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6 pt-6 pb-28">
      <AppHeader
        left={
          <button
            onClick={() => router.back()}
            className="flex size-9 items-center justify-center rounded-full text-grey-700 hover:bg-grey-100 dark:text-grey-300 dark:hover:bg-grey-800"
            aria-label="뒤로"
          >
            <ChevronLeft size={20} />
          </button>
        }
        title="구독 플랜"
        titleClassName="text-xl"
      />

      {/* 현재 상태 */}
      <section className="px-4">
        <div className="rounded-2xl border border-grey-200 p-4 dark:border-grey-800">
          <p className="text-xs text-grey-500 dark:text-grey-400">현재 플랜</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-lg font-bold text-grey-900 dark:text-white">
              {PLANS[plan].name}
            </span>
            {primary && !primary.expired ? (
              <span className="text-xs text-grey-500 dark:text-grey-400">
                {fmtDate(primary.expiresMs)}까지
              </span>
            ) : primary?.expired ? (
              <span className="text-xs text-red-500">만료됨</span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-grey-400">
            구독권은 NFT로 발급되어 지갑에 보관됩니다.
          </p>
        </div>
      </section>

      {!SubscriptionConfigured && (
        <p className="px-4 text-xs text-amber-600">
          ⚠️ 컨트랙트 미배포 상태입니다. NEXT_PUBLIC_SUBSCRIPTION_PKG /
          _CONFIG 를 설정하세요.
        </p>
      )}

      {/* 플랜 카드 */}
      <section className="space-y-3 px-4">
        {PAID_PLANS.map((p) => {
          const def = PLANS[p]
          const comingSoon = !def.available // pro/max = 추후 공개
          const kind = resolveAction(p)
          const isBusy = busy === p
          const disabled =
            comingSoon ||
            kind === "lower" ||
            !SubscriptionConfigured ||
            !!busy
          const label = comingSoon
            ? "추후 공개"
            : kind === "renew"
              ? "갱신"
              : kind === "upgrade"
                ? "업그레이드"
                : kind === "lower"
                  ? "보유 중 상위 플랜"
                  : "구독 시작"
          const highlight = PLANS[plan].tier === def.tier && activeTier > 0

          return (
            <div
              key={p}
              className={cn(
                "rounded-2xl border p-4",
                comingSoon && "opacity-60",
                highlight
                  ? "border-brand bg-brand/5"
                  : "border-grey-200 dark:border-grey-800"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-grey-900 dark:text-white">
                    {def.name}
                  </span>
                  {highlight && (
                    <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
                      이용 중
                    </span>
                  )}
                  {comingSoon && (
                    <span className="rounded-full bg-grey-200 px-2 py-0.5 text-[10px] font-semibold text-grey-500 dark:bg-grey-700 dark:text-grey-300">
                      추후 공개
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-grey-900 dark:text-white">
                    {def.priceLabel}
                  </p>
                  <p className="text-[11px] text-grey-400">
                    {suiLabel(PRICE_MIST[p])}
                  </p>
                </div>
              </div>

              <ul className="mt-3 space-y-1">
                {def.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-1.5 text-xs text-grey-600 dark:text-grey-300"
                  >
                    <Check size={13} className="shrink-0 text-brand" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handle(p)}
                disabled={disabled}
                className={cn(
                  "mt-3 flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold transition-colors",
                  disabled
                    ? "bg-grey-100 text-grey-400 dark:bg-grey-800 dark:text-grey-500"
                    : "bg-brand text-white hover:bg-brand-600"
                )}
              >
                {isBusy ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  label
                )}
              </button>
            </div>
          )
        })}
      </section>

      {error && (
        <p className="px-4 text-center text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <section className="px-4">
        <Link
          href="/market"
          className="flex items-center justify-center gap-2 rounded-2xl border border-grey-200 py-3 text-sm font-semibold text-grey-700 hover:bg-grey-50 dark:border-grey-800 dark:text-grey-200 dark:hover:bg-grey-800"
        >
          <Store size={16} />
          구독권 거래소
        </Link>
      </section>
    </div>
  )
}
