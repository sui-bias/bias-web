"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSuiClient } from "@mysten/dapp-kit"
import { ChevronLeft, Loader2, Tag, ShoppingCart } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { usePlan } from "@/components/plan-provider"
import { usePassActions } from "@/hooks/use-pass-actions"
import { PLANS } from "@/lib/plans"
import {
  getActiveListings,
  MarketListing,
  OwnedPass,
} from "@/lib/pass"
import {
  buildBuyTx,
  buildDelistTx,
  buildListTx,
  SubscriptionConfigured,
} from "@/lib/subscription"
import { clearSubscription, cacheSubscription } from "@/lib/users"
import { cn } from "@/lib/utils"

function suiLabel(mist: bigint) {
  return `${Number(mist) / 1e9} SUI`
}
function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  })
}
function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export default function MarketPage() {
  const router = useRouter()
  const client = useSuiClient()
  const { account, execute } = usePassActions()
  const { passes, refresh: refreshPlan } = usePlan()

  const [listings, setListings] = useState<MarketListing[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadListings = useCallback(async () => {
    setLoading(true)
    try {
      setListings(await getActiveListings(client))
    } catch (e) {
      console.error("[market] load error:", e)
    }
    setLoading(false)
  }, [client])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadListings()
  }, [loadListings])

  async function refreshAll() {
    await Promise.all([loadListings(), refreshPlan()])
  }

  async function buy(l: MarketListing) {
    if (!account) return setError("지갑을 먼저 연결해주세요.")
    setError(null)
    setBusy(l.listingId)
    try {
      await execute(buildBuyTx(l.listingId, l.priceMist))
      try {
        await cacheSubscription(account.address, l.plan, l.passId, l.expiresMs)
      } catch (e) {
        console.error("[market] buy cache error:", e)
      }
      await refreshAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : "구매에 실패했습니다.")
    } finally {
      setBusy(null)
    }
  }

  async function delist(l: MarketListing) {
    setError(null)
    setBusy(l.listingId)
    try {
      await execute(buildDelistTx(l.listingId))
      await refreshAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : "취소에 실패했습니다.")
    } finally {
      setBusy(null)
    }
  }

  async function listPass(pass: OwnedPass, priceSui: string) {
    if (!account) return setError("지갑을 먼저 연결해주세요.")
    const sui = Number(priceSui)
    if (!sui || sui <= 0) return setError("가격을 입력해주세요.")
    setError(null)
    setBusy(pass.id)
    try {
      const mist = BigInt(Math.round(sui * 1e9))
      await execute(buildListTx(pass.id, mist))
      // 판매 등록 시 Pass 가 에스크로로 이동 → 캐시 정리.
      try {
        await clearSubscription(account.address, pass.id, "sold")
      } catch (e) {
        console.error("[market] list cache error:", e)
      }
      await refreshAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록에 실패했습니다.")
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
        title="구독권 거래소"
        titleClassName="text-xl"
      />

      {!SubscriptionConfigured && (
        <p className="px-4 text-xs text-amber-600">
          ⚠️ 컨트랙트 미배포 상태입니다.
        </p>
      )}

      {/* 내 구독권 판매 등록 */}
      <section className="space-y-2 px-4">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-grey-900 dark:text-white">
          <Tag size={15} className="text-brand" /> 내 구독권 판매하기
        </h2>
        {passes.length === 0 ? (
          <p className="text-xs text-grey-400">보유한 구독권 NFT가 없습니다.</p>
        ) : (
          passes.map((pass) => (
            <SellRow
              key={pass.id}
              pass={pass}
              busy={busy === pass.id}
              onList={(price) => listPass(pass, price)}
            />
          ))
        )}
      </section>

      {/* 판매 중 목록 */}
      <section className="space-y-2 px-4">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-grey-900 dark:text-white">
          <ShoppingCart size={15} className="text-brand" /> 판매 중
        </h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-grey-400" />
          </div>
        ) : listings.length === 0 ? (
          <p className="text-xs text-grey-400">등록된 구독권이 없습니다.</p>
        ) : (
          listings.map((l) => {
            const mine = account?.address === l.seller
            const isBusy = busy === l.listingId
            return (
              <div
                key={l.listingId}
                className="flex items-center justify-between rounded-2xl border border-grey-200 p-4 dark:border-grey-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-grey-900 dark:text-white">
                    {PLANS[l.plan].name}
                    <span className="ml-2 text-xs font-normal text-grey-400">
                      {fmtDate(l.expiresMs)}까지
                    </span>
                  </p>
                  <p className="truncate text-[11px] text-grey-400">
                    판매자 {shortAddr(l.seller)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-bold text-grey-900 dark:text-white">
                    {suiLabel(l.priceMist)}
                  </span>
                  <button
                    onClick={() => (mine ? delist(l) : buy(l))}
                    disabled={!!busy}
                    className={cn(
                      "flex h-9 min-w-[64px] items-center justify-center rounded-xl px-3 text-xs font-semibold transition-colors disabled:opacity-50",
                      mine
                        ? "border border-grey-300 text-grey-700 dark:border-grey-600 dark:text-grey-200"
                        : "bg-brand text-white hover:bg-brand-600"
                    )}
                  >
                    {isBusy ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : mine ? (
                      "등록 취소"
                    ) : (
                      "구매"
                    )}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </section>

      {error && (
        <p className="px-4 text-center text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

function SellRow({
  pass,
  busy,
  onList,
}: {
  pass: OwnedPass
  busy: boolean
  onList: (price: string) => void
}) {
  const [price, setPrice] = useState("")
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-grey-200 p-3 dark:border-grey-800">
      <div className="min-w-0">
        <p className="text-sm font-bold text-grey-900 dark:text-white">
          {PLANS[pass.plan].name}
          {pass.expired && (
            <span className="ml-2 text-xs font-normal text-red-500">만료</span>
          )}
        </p>
        <p className="text-[11px] text-grey-400">{fmtDate(pass.expiresMs)}까지</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          inputMode="decimal"
          placeholder="가격"
          className="h-9 w-20 rounded-xl border border-grey-200 bg-transparent px-2 text-right text-xs text-grey-900 outline-none focus:border-brand dark:border-grey-700 dark:text-white"
        />
        <span className="text-[11px] text-grey-400">SUI</span>
        <button
          onClick={() => onList(price)}
          disabled={busy}
          className="flex h-9 items-center justify-center rounded-xl bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : "등록"}
        </button>
      </div>
    </div>
  )
}
