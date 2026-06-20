"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, AlertCircle } from "lucide-react"
import {
  useWallets,
  useConnectWallet,
  useCurrentAccount,
  useSignPersonalMessage,
  useAutoConnectWallet,
} from "@mysten/dapp-kit"
import { AppHeader } from "@/components/app-header"
import { buildLoginMessage } from "@/lib/auth"
import { cn } from "@/lib/utils"

type Account = NonNullable<ReturnType<typeof useCurrentAccount>>
type Phase = "idle" | "connecting" | "signing" | "verifying"

export default function ConnectPage() {
  const router = useRouter()
  const wallets = useWallets()
  const currentAccount = useCurrentAccount()
  const { mutate: connect } = useConnectWallet()
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage()
  const autoConnect = useAutoConnectWallet()

  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState<string | null>(null)
  const busy = phase !== "idle"

  // autoConnect 가 캐시 복원을 끝내기 전엔 currentAccount 가 잠깐 비어 레이스가 난다.
  // 복원이 끝날(settled) 때까지 버튼을 잠가 "연결 안 됨" 오작동을 막는다.
  const settled = autoConnect === "attempted" || autoConnect === "disabled"

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
      // 지갑이 잠겨있거나(unlock 필요) 사용자가 서명을 취소하면 여기로 온다.
      // 연결은 그대로 유지한다 — 여기서 disconnect 하면 잠금해제 후에도
      // 재연결 루프가 생긴다. 같은 버튼으로 다시 누르면 곧바로 재서명된다.
      setPhase("idle")
      setError(
        e instanceof Error && /reject|denied|cancel/i.test(e.message)
          ? "서명이 취소되었습니다. 다시 시도해주세요."
          : "지갑 잠금을 해제한 뒤 다시 시도해주세요."
      )
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

  const subtitle = !settled
    ? "Restoring session…"
    : phase === "connecting"
      ? "Connecting…"
      : phase === "signing"
        ? "Approve the signature in your wallet…"
        : phase === "verifying"
          ? "Verifying signature…"
          : "by Mysten Labs · social login supported"

  return (
    <div className="flex min-h-svh flex-col bg-white dark:bg-grey-900">
      {/* Header */}
      <AppHeader
        className="px-4 pt-10 pb-4"
        left={
          <Link
            href="/onboarding"
            className="flex size-10 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-300 dark:hover:bg-grey-800"
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </Link>
        }
        title="Connect Wallet"
        titleClassName="text-lg"
      />

      {/* Description */}
      <div className="px-6 pb-6">
        <p className="text-sm text-grey-500 dark:text-grey-400">
          Bias uses your Sui wallet address as your account. Connect with Slush
          and sign a message to log in.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Slush connect button */}
      <ul className="flex flex-col gap-2 px-4">
        <li>
          <button
            onClick={handleConnect}
            disabled={busy || !settled}
            className={cn(
              "flex w-full items-center gap-4 rounded-2xl border border-grey-200 bg-grey-50 px-4 py-4 text-left transition-colors",
              "hover:border-brand/40 hover:bg-brand-lightest",
              "disabled:pointer-events-none disabled:opacity-60",
              "dark:border-grey-700 dark:bg-grey-800 dark:hover:bg-grey-700"
            )}
          >
            {/* Wallet icon */}
            <div className="flex size-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-grey-200 dark:bg-grey-700">
              {slush?.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slush.icon} alt="Slush" className="size-7" />
              ) : (
                <span className="text-xs font-bold text-grey-600 dark:text-grey-300">
                  S
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-grey-900 dark:text-white">
                Slush
              </p>
              <p className="truncate text-xs text-grey-500 dark:text-grey-400">
                {subtitle}
              </p>
            </div>
            {(busy || !settled) && (
              <div className="size-5 animate-spin rounded-full border-2 border-grey-300 border-t-brand" />
            )}
          </button>
        </li>
      </ul>

      {/* Footer */}
      <div className="mt-auto px-6 pt-8 pb-12 text-center">
        <p className="text-xs text-grey-400">
          Don&apos;t have a wallet?{" "}
          <a
            href="https://slush.app"
            target="_blank"
            rel="noreferrer"
            className="text-brand underline underline-offset-2"
          >
            Get Slush
          </a>
        </p>
      </div>
    </div>
  )
}
