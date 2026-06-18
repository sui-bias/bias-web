import type { ProvidedCharacterId } from "@/lib/provided-characters"

const WEB_TO_BIAS_CHAT_CHARACTER_ID: Record<ProvidedCharacterId, string> = {
  spider_man: "spiderman",
  tony_stark: "tony_stark",
}

export function toBiasChatCharacterId(webCharacterId: string): string | null {
  if (webCharacterId in WEB_TO_BIAS_CHAT_CHARACTER_ID) {
    return WEB_TO_BIAS_CHAT_CHARACTER_ID[webCharacterId as ProvidedCharacterId]
  }

  return null
}
