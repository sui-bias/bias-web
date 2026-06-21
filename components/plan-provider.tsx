"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit"
import { Plan } from "@/lib/plans"
import {
  currentPlanFromPasses,
  getOwnedPasses,
  OwnedPass,
  primaryPass,
} from "@/lib/pass"

interface PlanContextValue {
  plan: Plan
  passes: OwnedPass[]
  primary: ReturnType<typeof primaryPass>
  loading: boolean
  refresh: () => Promise<void>
}

const PlanContext = createContext<PlanContextValue | null>(null)

/**
 * 구독 plan 을 앱 전역에서 1개 소스로 공유한다.
 * 진짜 소스는 온체인 NFT 소유라, 다음 시점마다 다시 조회해 항상 최신을 유지한다:
 *  - 지갑 계정 변경
 *  - 창 포커스 복귀(앱 밖에서 거래·만료된 경우 반영)
 *  - 결제 직후(consumer 가 refresh() 호출)
 */
export function PlanProvider({ children }: { children: ReactNode }) {
  const account = useCurrentAccount()
  const client = useSuiClient()
  const [passes, setPasses] = useState<OwnedPass[]>([])
  const [loading, setLoading] = useState(true)
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (!account) {
      setPasses([])
      setLoading(false)
      return
    }
    if (inFlight.current) return // 포커스 등으로 인한 중복 조회 방지
    inFlight.current = true
    setLoading(true)
    try {
      setPasses(await getOwnedPasses(client, account.address))
    } catch (e) {
      // 일시적 RPC 실패. 직전 plan 을 그대로 유지한다 — 빈 배열로 덮으면
      // 유료 유저가 잠깐 'free' 로 강등돼 업그레이드 안내/기능잠금이 깜빡인다.
      console.error("[plan] getOwnedPasses error:", e)
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [account, client])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  useEffect(() => {
    const onFocus = () => refresh()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refresh])

  const plan = currentPlanFromPasses(passes)
  const primary = primaryPass(passes)

  return (
    <PlanContext.Provider value={{ plan, passes, primary, loading, refresh }}>
      {children}
    </PlanContext.Provider>
  )
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext)
  if (!ctx) throw new Error("usePlan must be used within PlanProvider")
  return ctx
}
