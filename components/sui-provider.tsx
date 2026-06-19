"use client"

import { ReactNode, useState } from "react"
import {
  SuiClientProvider,
  WalletProvider,
  createNetworkConfig,
} from "@mysten/dapp-kit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { getFullnodeUrl } from "@mysten/sui/client"
import "@mysten/dapp-kit/dist/index.css"

// Bias는 mainnet에 배포한다. 개발 중에는 NEXT_PUBLIC_SUI_NETWORK=testnet 으로 전환 가능.
const { networkConfig } = createNetworkConfig({
  mainnet: { url: getFullnodeUrl("mainnet") },
  testnet: { url: getFullnodeUrl("testnet") },
})

const DEFAULT_NETWORK =
  (process.env.NEXT_PUBLIC_SUI_NETWORK as "mainnet" | "testnet") ?? "mainnet"

export function SuiProvider({ children }: { children: ReactNode }) {
  // QueryClient는 컴포넌트 인스턴스마다 1개만 생성되도록 useState로 보관.
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={DEFAULT_NETWORK}>
        {/*
          slushWallet 옵션: Slush 확장프로그램이 없는 유저도
          Slush 웹 지갑(소셜 로그인/zkLogin 팝업)으로 연결할 수 있게 등록한다.
          확장프로그램 유저는 wallet-standard로 자동 감지된다.
        */}
        <WalletProvider autoConnect slushWallet={{ name: "Bias" }}>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}
