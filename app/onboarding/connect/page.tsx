"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, AlertCircle } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { cn } from "@/lib/utils"

const WALLETS = [
  // { id: "sui", name: "Sui Wallet", description: "Official Sui wallet" },
  { id: "slush", name: "Slush", description: "by Mysten Labs" },
  // { id: "martian", name: "Martian Sui Wallet", description: "by Martian" },
  // { id: "suiet", name: "Suiet", description: "Community wallet" },
] as const

type WalletId = (typeof WALLETS)[number]["id"]

export default function ConnectPage() {
  const router = useRouter()
  const [connecting, setConnecting] = useState<WalletId | null>(null)
  const [error, setError] = useState(false)

  async function handleConnect(id: WalletId) {
    setConnecting(id)
    setError(false)
    // TODO: actual Sui wallet connection
    await new Promise((r) => setTimeout(r, 1200))
    router.push("/onboarding/profile")
  }

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
          Bias uses your Sui wallet address as your account. Select a wallet to
          connect.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          <AlertCircle size={16} className="flex-shrink-0" />
          Connection failed. Please try again.
        </div>
      )}

      {/* Wallet list */}
      <ul className="flex flex-col gap-2 px-4">
        {WALLETS.map((wallet) => (
          <li key={wallet.id}>
            <button
              onClick={() => handleConnect(wallet.id)}
              disabled={connecting !== null}
              className={cn(
                "flex w-full items-center gap-4 rounded-2xl border border-grey-200 bg-grey-50 px-4 py-4 text-left transition-colors",
                "hover:border-brand/40 hover:bg-brand-lightest",
                "disabled:pointer-events-none disabled:opacity-60",
                "dark:border-grey-700 dark:bg-grey-800 dark:hover:bg-grey-700"
              )}
            >
              {/* Wallet icon placeholder */}
              <div className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-grey-200 dark:bg-grey-700">
                <span className="text-xs font-bold text-grey-600 dark:text-grey-300">
                  {wallet.name[0]}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-grey-900 dark:text-white">
                  {wallet.name}
                </p>
                <p className="text-xs text-grey-500 dark:text-grey-400">
                  {wallet.description}
                </p>
              </div>
              {connecting === wallet.id && (
                <div className="size-5 animate-spin rounded-full border-2 border-grey-300 border-t-brand" />
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="mt-auto px-6 pt-8 pb-12 text-center">
        <p className="text-xs text-grey-400">
          Don't have a wallet?{" "}
          <a
            href="https://sui.io/wallets"
            target="_blank"
            rel="noreferrer"
            className="text-brand underline underline-offset-2"
          >
            Get a Sui wallet
          </a>
        </p>
      </div>
    </div>
  )
}
