"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, AlertCircle } from "lucide-react"
import {
  useWallets,
  useConnectWallet,
  useCurrentAccount,
  useSignPersonalMessage,
} from "@mysten/dapp-kit"
import { AppHeader } from "@/components/app-header"
import { buildLoginMessage } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"

type Account = NonNullable<ReturnType<typeof useCurrentAccount>>
type Phase = "idle" | "connecting" | "signing" | "verifying"

export default function ConnectWallet() {
  const router = useRouter()
  const wallets = useWallets()
  const currentAccount = useCurrentAccount()
  const { mutate: connect } = useConnectWallet()
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage()

  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const busy = phase !== "idle"

  useEffect(() => {
    setMounted(true)
  }, [])

  // dapp-kit이 감지한 지갑 중 Slush를 찾는다. (확장프로그램 + 웹 지갑)
  const slush = wallets.find((w) => w.name.toLowerCase().includes("slush"))

  // 연결된 계정으로 로그인: 메시지 서명 → 서버 검증 → 신규/기존 분기.
  async function login(account: Account) {
    setPhase("signing")
    setError(null)
    try {
      const issuedAt = new Date().toISOString()
      const message = new TextEncoder().encode(
        buildLoginMessage(account.address, issuedAt)
      )
      const { bytes, signature } = await signPersonalMessage({
        message,
        account,
      })

      setPhase("verifying")
      const res = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bytes, signature }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({}))
        throw new Error(msg ?? "로그인에 실패했습니다.")
      }
      const { isNew } = (await res.json()) as { isNew: boolean }

      // 신규 → 프로필 작성, 기존 → 채팅. (router.replace 이후 phase 유지 = 스피너 유지)
      router.replace(isNew ? "/onboarding/profile" : "/chat")
    } catch (e) {
      setPhase("idle")
      setError(e instanceof Error ? e.message : "로그인에 실패했습니다.")
    }
  }

  function handleConnect() {
    if (!slush) {
      setError("Slush wallet not found. Install Slush and refresh.")
      return
    }
    setError(null)

    // 이미 연결돼 있으면(autoConnect 등) 바로 서명 로그인으로.
    if (currentAccount) {
      login(currentAccount)
      return
    }

    setPhase("connecting")
    connect(
      { wallet: slush },
      {
        onSuccess: (result) => {
          const account = result.accounts[0]
          if (account) login(account)
          else {
            setPhase("idle")
            setError("지갑 계정을 찾을 수 없습니다.")
          }
        },
        onError: () => {
          setPhase("idle")
          setError("Connection failed. Please try again.")
        },
      }
    )
  }

  const subtitle =
    phase === "connecting"
      ? "Connecting…"
      : phase === "signing"
        ? "Approve the signature in your wallet…"
        : phase === "verifying"
          ? "Verifying signature…"
          : "by Mysten Labs · social login supported"

  const slushIcon = mounted ? slush?.icon : undefined

  return (
    <Button size="xl" onClick={handleConnect} disabled={busy}>
      {slushIcon ? (
        <img src={slushIcon} alt="Slush" className="size-7" />
      ) : (
        <span className="text-xs font-bold text-grey-600 dark:text-grey-300">
          S
        </span>
      )}
      <p className="font-semibold">Start with Slush</p>
    </Button>
  )
}
