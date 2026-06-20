"use client"

import { useCallback, useEffect, useState } from "react"
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit"
import { Plan } from "@/lib/plans"
import {
  currentPlanFromPasses,
  getOwnedPasses,
  OwnedPass,
  primaryPass,
} from "@/lib/pass"

/**
 * 구독 plan 의 "진짜 소스" = 온체인 NFT 소유.
 * 연결된 지갑이 보유한 MembershipPass 를 조회해 plan/대표 Pass 를 계산한다.
 * (DB users.plan 은 표시 캐시일 뿐, 양도되면 stale 해지므로 신뢰하지 않는다.)
 */
export function useCurrentPlan() {
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
      console.error("[use-current-plan] getOwnedPasses error:", e)
      setPasses([])
    }
    setLoading(false)
  }, [account, client])

  useEffect(() => {
    // 계정 변경 시 온체인 Pass 를 다시 불러온다(정당한 데이터 패칭).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const plan: Plan = currentPlanFromPasses(passes)
  const primary = primaryPass(passes)

  return { plan, passes, primary, loading, refresh }
}
