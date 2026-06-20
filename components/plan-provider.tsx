"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

  const refresh = useCallback(async () => {
    if (!account) {
      setPasses([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setPasses(await getOwnedPasses(client, account.address))
    } catch (e) {
      console.error("[plan] getOwnedPasses error:", e)
      setPasses([])
    }
    setLoading(false)
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
