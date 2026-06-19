"use client"

import { useCallback, useEffect, useState } from "react"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { getUser, UserRow } from "@/lib/users"
import { Plan } from "@/lib/plans"

/** 연결된 지갑 주소 기준으로 Supabase 유저/플랜을 가져온다. */
export function useCurrentUser() {
  const account = useCurrentAccount()
  const [user, setUser] = useState<UserRow | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!account) {
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setUser(await getUser(account.address))
    setLoading(false)
  }, [account])

  useEffect(() => {
    // 계정 변경 시 Supabase 유저를 비동기로 다시 불러온다(정당한 데이터 패칭).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const plan: Plan = user?.plan ?? "free"

  return { address: account?.address ?? null, user, plan, loading, refresh }
}
