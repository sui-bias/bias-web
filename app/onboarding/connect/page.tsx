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

  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState<string | null>(null)
  const busy = phase !== "idle"

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
        throw new Error(msg ?? "Login failed.")
      }
      const { isNew } = (await res.json()) as { isNew: boolean }

      // 신규 → 프로필 작성, 기존 → 채팅. (router.replace 이후 phase 유지 = 스피너 유지)
      router.replace(isNew ? "/onboarding/profile" : "/chat")
    } catch (e) {
      setPhase("idle")
      setError(e instanceof Error ? e.message : "Login failed.")
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
            setError("Wallet account not found.")
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
            disabled={busy}
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
            {busy && (
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
