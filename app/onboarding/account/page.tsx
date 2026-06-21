"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSignPersonalMessage,
  useSuiClient,
} from "@mysten/dapp-kit"
import {
  addDelegateKey,
  createAccount,
} from "@mysten-incubation/memwal/account"
import { AppHeader } from "@/components/app-header"
import { Check, ChevronLeft, Copy, Key, Loader2, Pin } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MemwalStep } from "@/lib/types"
import { cn } from "@/lib/utils"

type Phase =
  | "idle"
  | "preparing"
  | "creating"
  | "delegating_memwal"
  | "delegating_seal"
  | "done"
type Proof = { bytes: string; signature: string }
type StatusResponse = {
  step: MemwalStep
  accountId: string | null
  memwalDelegatePubKey: string | null
  sealDelegatePubKey: string | null
  error: string | null
  needsCreate?: boolean
}
type ConfigResponse = {
  packageId: string
  registryId: string
  serverDelegatePubKey: string
  serverSealDelegatePubKey: string
  network: "mainnet" | "testnet"
}

type DelegateKeyEntry = {
  fields?: {
    public_key?: unknown
  }
}

export default function AccountPage() {
  const router = useRouter()
  const account = useCurrentAccount()
  const suiClient = useSuiClient()
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction()
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage()

  const [phase, setPhase] = useState<Phase>("idle")
  const [remoteStep, setRemoteStep] = useState<MemwalStep>("pending")
  const [error, setError] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)

  const busy = phase !== "idle"

  async function fetchStatus(address: string): Promise<StatusResponse> {
    const res = await fetch(
      `/api/memwal/onboard/status?address=${encodeURIComponent(address)}`,
      { cache: "no-store" }
    )
    const json = (await res
      .json()
      .catch(() => ({}))) as Partial<StatusResponse> & {
      error?: string
    }
    if (!res.ok) throw new Error(json.error ?? "Failed to check status.")
    return {
      step: (json.step ?? "pending") as MemwalStep,
      accountId: json.accountId ?? null,
      memwalDelegatePubKey: json.memwalDelegatePubKey ?? null,
      sealDelegatePubKey: json.sealDelegatePubKey ?? null,
      error: json.error ?? null,
      needsCreate: json.needsCreate,
    }
  }

  async function postStep(
    endpoint: string,
    body: Proof & { accountId?: string; error?: string }
  ): Promise<StatusResponse> {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = (await res
      .json()
      .catch(() => ({}))) as Partial<StatusResponse> & {
      error?: string
    }
    if (!res.ok) throw new Error(json.error ?? "Failed to update step.")
    return {
      step: (json.step ?? "pending") as MemwalStep,
      accountId: json.accountId ?? null,
      memwalDelegatePubKey: json.memwalDelegatePubKey ?? null,
      sealDelegatePubKey: json.sealDelegatePubKey ?? null,
      error: json.error ?? null,
      needsCreate: json.needsCreate,
    }
  }

  async function ensureStep(address: string, expected: MemwalStep) {
    const status = await fetchStatus(address)
    setRemoteStep(status.step)
    setAccountId(status.accountId)
    if (status.step !== expected) {
      throw new Error(
        `Step check failed: expected=${expected}, got=${status.step}`
      )
    }
  }

  function normalizeHex(hex: string): string {
    const trimmed = hex.trim().toLowerCase()
    return trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed
  }

  function bytesToHex(bytes: number[]): string {
    return bytes.map((b) => b.toString(16).padStart(2, "0")).join("")
  }

  async function hasDelegateKey(
    memwalAccountId: string,
    targetPublicKeyHex: string
  ): Promise<boolean> {
    const obj = await suiClient.getObject({
      id: memwalAccountId,
      options: { showContent: true },
    })

    const content = obj.data?.content
    if (!content || content.dataType !== "moveObject") return false

    const fields =
      "fields" in content
        ? (content.fields as { delegate_keys?: unknown })
        : undefined
    const delegateKeys = Array.isArray(fields?.delegate_keys)
      ? (fields.delegate_keys as DelegateKeyEntry[])
      : []

    const normalizedTarget = normalizeHex(targetPublicKeyHex)

    return delegateKeys.some((entry) => {
      const raw = entry?.fields?.public_key
      if (!Array.isArray(raw)) return false
      if (!raw.every((v) => typeof v === "number")) return false
      const keyHex = bytesToHex(raw)
      return normalizeHex(keyHex) === normalizedTarget
    })
  }

  useEffect(() => {
    if (!account?.address) return
    setLoadingStatus(true)
    fetchStatus(account.address)
      .then((status) => {
        setRemoteStep(status.step)
        setAccountId(status.accountId)
        if (status.step === "done") setPhase("done")
      })
      .catch(() => {
        // 첫 진입(미생성 유저 등)에서는 무시
      })
      .finally(() => setLoadingStatus(false))
  }, [account?.address])

  async function handleOnboard() {
    if (!account?.address) {
      setError("Wallet not connected.")
      return
    }

    setError(null)
    setPhase("preparing")
    let proof: Proof | null = null
    let createdAccountId: string | null = null

    try {
      const configRes = await fetch("/api/memwal/onboard/config", {
        cache: "no-store",
      })
      const config = (await configRes
        .json()
        .catch(() => ({}))) as Partial<ConfigResponse> & {
        error?: string
      }
      if (!configRes.ok) {
        throw new Error(config.error ?? "Failed to fetch MemWal config.")
      }
      if (
        !config.packageId ||
        !config.registryId ||
        !config.serverDelegatePubKey ||
        !config.serverSealDelegatePubKey
      ) {
        throw new Error("MemWal config values are missing.")
      }

      const issuedAt = new Date().toISOString()
      const messageText = `BIAS_MEMWAL_ONBOARD_STATE\naddress:${account.address}\nissuedAt:${issuedAt}`
      const message = new TextEncoder().encode(messageText)

      const signResult = await signPersonalMessage({
        account,
        message,
      })
      proof = { bytes: signResult.bytes, signature: signResult.signature }

      const creatingState = await postStep(
        "/api/memwal/onboard/step/creating",
        proof
      )
      setRemoteStep(creatingState.step)
      setAccountId(creatingState.accountId)
      if (creatingState.step === "done" && creatingState.accountId) {
        setPhase("done")
        return
      }

      const walletSigner = {
        address: account.address,
        signAndExecuteTransaction: async ({
          transaction,
        }: {
          transaction: unknown
        }) => {
          const result = await signAndExecuteTransaction({
            transaction: transaction as never,
            account,
          })
          if (!("digest" in result) || typeof result.digest !== "string") {
            throw new Error("Couldn't verify the transaction digest.")
          }
          return { digest: result.digest }
        },
        signPersonalMessage: async ({ message }: { message: Uint8Array }) => {
          const result = await signPersonalMessage({ account, message })
          return { signature: result.signature }
        },
      }

      let memwalAccountId = creatingState.accountId
      if (creatingState.needsCreate) {
        await ensureStep(account.address, "creating")
        setPhase("creating")

        const created = await createAccount({
          packageId: config.packageId,
          registryId: config.registryId,
          walletSigner,
          suiClient,
          suiNetwork: config.network ?? "mainnet",
        })
        memwalAccountId = created.accountId

        const syncedCreatingState = await postStep(
          "/api/memwal/onboard/step/creating",
          { ...proof, accountId: created.accountId }
        )
        setRemoteStep(syncedCreatingState.step)
        setAccountId(syncedCreatingState.accountId ?? created.accountId)
      }

      if (!memwalAccountId) {
        throw new Error("Couldn't verify the MemWal accountId.")
      }
      createdAccountId = memwalAccountId
      setAccountId(memwalAccountId)
      await ensureStep(account.address, "delegate_memwal")

      const delegateState = await postStep(
        "/api/memwal/onboard/step/delegate-memwal",
        { ...proof, accountId: memwalAccountId }
      )
      setRemoteStep(delegateState.step)
      await ensureStep(account.address, "delegate_memwal")

      setPhase("delegating_memwal")
      const hasMemwalDelegate = await hasDelegateKey(
        memwalAccountId,
        config.serverDelegatePubKey
      )
      if (!hasMemwalDelegate) {
        await addDelegateKey({
          packageId: config.packageId,
          accountId: memwalAccountId,
          publicKey: config.serverDelegatePubKey,
          label: "bias-server-memwal",
          walletSigner,
          suiClient,
          suiNetwork: config.network ?? "mainnet",
        })
      }

      const delegateSealState = await postStep(
        "/api/memwal/onboard/step/delegate-seal",
        { ...proof, accountId: memwalAccountId }
      )
      setRemoteStep(delegateSealState.step)
      await ensureStep(account.address, "delegate_seal")

      setPhase("delegating_seal")
      const hasSealDelegate = await hasDelegateKey(
        memwalAccountId,
        config.serverSealDelegatePubKey
      )
      if (!hasSealDelegate) {
        await addDelegateKey({
          packageId: config.packageId,
          accountId: memwalAccountId,
          publicKey: config.serverSealDelegatePubKey,
          label: "bias-server-seal",
          walletSigner,
          suiClient,
          suiNetwork: config.network ?? "mainnet",
        })
      }

      const doneState = await postStep("/api/memwal/onboard/step/done", {
        ...proof,
        accountId: memwalAccountId,
      })
      setRemoteStep(doneState.step)
      setAccountId(doneState.accountId ?? memwalAccountId)
      await ensureStep(account.address, "done")

      setPhase("done")
    } catch (e) {
      if (proof) {
        try {
          await postStep("/api/memwal/onboard/step/failed", {
            ...proof,
            accountId: createdAccountId ?? undefined,
            error: e instanceof Error ? e.message : "Onboarding failed.",
          })
          setRemoteStep("failed")
        } catch {
          // 상태 저장 실패는 원래 에러를 덮지 않음
        }
      }
      setPhase("idle")
      setError(e instanceof Error ? e.message : "Onboarding failed.")
    }
  }

  const creatingDone =
    remoteStep === "delegate_memwal" ||
    remoteStep === "delegate_seal" ||
    remoteStep === "done"
  const delegateMemwalDone =
    remoteStep === "delegate_seal" || remoteStep === "done"
  const delegateSealDone = remoteStep === "done"

  return (
    <div className="space-y-4 pt-6">
      {/* Header */}
      <AppHeader
        left={
          <button
            onClick={() => router.back()}
            className="flex size-9 items-center justify-center rounded-full text-grey-700 hover:bg-grey-100 dark:text-grey-300 dark:hover:bg-grey-800"
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
        }
        title="Memwal Onboarding"
      />

      {/* Step progress bar */}
      <div className="flex gap-1.5 px-6 pb-4">
        {Array.from({ length: 3 }).map((_, i) => {
          let currentStep = 0
          switch (remoteStep) {
            case "creating":
              currentStep = 1
              break
            case "delegate_memwal":
              currentStep = 2
              break
            case "delegate_seal":
              currentStep = 3
              break
            case "done":
              currentStep = 3
              break
            default:
              currentStep = 0
          }
          return (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                i < currentStep ? "bg-brand" : "bg-grey-200 dark:bg-grey-700"
              )}
            />
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-36">
        <div className="space-y-6">
          <div className="rounded-xl bg-brand/10 p-4">
            <Pin size={14} className="text-brand" />
            <p className="text-sm text-brand">
              By continuing, you agree to{" "}
              <span className="font-semibold">
                create a MemWal account and grant delegate keys
              </span>{" "}
              to MyBias.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <p className="font-semibold text-grey-600 dark:text-grey-300">
                ➊ Create Memwal Account
              </p>
              <p className="text-sm text-grey-600 dark:text-grey-300">
                {remoteStep === "creating" || phase === "creating" ? (
                  <span className="flex items-center gap-1">
                    <Loader2 size={14} className="animate-spin" />
                    Creating ...
                  </span>
                ) : (
                  ""
                )}
                {accountId && (
                  <span className="flex items-center gap-1 text-brand">
                    <Check size={14} />
                    <span className="inline-flex items-center gap-2">
                      Created
                      <span className="flex items-center gap-1 rounded-md bg-brand/10 px-1.5 py-1">
                        accountId: {accountId.slice(0, 5)}...
                        {accountId.slice(-4)}
                        <Copy
                          size={12}
                          className="ml-1 cursor-pointer"
                          onClick={() => {
                            navigator.clipboard.writeText(accountId)
                          }}
                        />
                      </span>
                    </span>
                  </span>
                )}
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-grey-600 dark:text-grey-300">
                ➋ Delegate Memwal to MyBias
              </p>
              <p className="text-sm text-grey-600 dark:text-grey-300">
                {remoteStep === "delegate_memwal" ||
                phase === "delegating_memwal" ? (
                  <span className="flex items-center gap-1">
                    <Loader2 size={14} className="animate-spin" />
                    Delegating ...
                  </span>
                ) : (
                  ""
                )}
                {delegateMemwalDone && (
                  <span className="flex items-center gap-1 text-brand">
                    <Check size={14} />
                    Delegated
                  </span>
                )}
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-grey-600 dark:text-grey-300">
                ➌ Delegate Seal to MyBias
              </p>
              <p className="text-sm text-grey-600 dark:text-grey-300">
                {remoteStep === "delegate_seal" ||
                phase === "delegating_seal" ? (
                  <span className="flex items-center gap-1">
                    <Loader2 size={14} className="animate-spin" />
                    Delegating ...
                  </span>
                ) : (
                  ""
                )}
                {delegateSealDone && (
                  <span className="flex items-center gap-1 text-brand">
                    <Check size={14} />
                    Delegated
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed right-0 bottom-0 left-0 space-y-1 border-t border-grey-100 bg-white/90 px-6 pt-4 pb-8 backdrop-blur dark:border-grey-800 dark:bg-grey-900/90">
        {error && (
          <p className="text-center text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {phase === "done" ? (
          <Button
            onClick={() => router.push("/onboarding/character")}
            size="xl"
            className="w-full"
          >
            Continue
          </Button>
        ) : (
          <Button
            onClick={handleOnboard}
            disabled={busy}
            size="xl"
            className="w-full"
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  )
}
