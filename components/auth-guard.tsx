"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCurrentAccount, useAutoConnectWallet } from "@mysten/dapp-kit"

/**
 * 보호된 화면용 가드. 지갑이 연결돼 있어야(=로그인 상태) 통과시킨다.
 * autoConnect 가 세션을 복원하는 중에는 튕기지 않고 기다린다(재방문 유저 보호).
 * 미연결로 확정되면 온보딩으로 돌려보낸다.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const account = useCurrentAccount()
  const autoConnect = useAutoConnectWallet()

  // autoConnect 시도가 끝났는데도 계정이 없으면 미로그인 → 온보딩으로.
  const settled = autoConnect === "attempted" || autoConnect === "disabled"

  useEffect(() => {
    if (settled && !account) router.replace("/onboarding")
  }, [settled, account, router])

  // 복원 대기 중이거나 리다이렉트 직전 → 콘텐츠 플래시 방지용 스피너.
  if (!account) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-white dark:bg-grey-900">
        <div className="size-6 animate-spin rounded-full border-2 border-grey-300 border-t-brand" />
      </div>
    )
  }

  return <>{children}</>
}
