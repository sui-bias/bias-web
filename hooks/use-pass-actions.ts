"use client"

import { useCallback } from "react"
import type { Transaction } from "@mysten/sui/transactions"
import type { SuiObjectChange } from "@mysten/sui/jsonRpc"
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit"

/**
 * 구독 관련 트랜잭션을 서명·실행하고 objectChanges 를 돌려준다.
 * dapp-kit 기본 결과는 digest 뿐이므로 waitForTransaction 으로 변경분을 받아온다.
 */
export function usePassActions() {
  const account = useCurrentAccount()
  const client = useSuiClient()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

  const execute = useCallback(
    async (tx: Transaction): Promise<SuiObjectChange[]> => {
      if (!account) throw new Error("지갑이 연결되지 않았습니다.")
      const res = await signAndExecute({ transaction: tx, account })
      const full = await client.waitForTransaction({
        digest: res.digest,
        options: { showObjectChanges: true },
      })
      return full.objectChanges ?? []
    },
    [account, client, signAndExecute]
  )

  return { account, execute }
}
