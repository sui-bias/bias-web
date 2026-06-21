import { NextResponse } from "next/server"
import { MemWalManual } from "@mysten-incubation/memwal/manual"
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc"
import { createHash } from "node:crypto"
import { listMessages } from "@/lib/rooms"
import { getUser } from "@/lib/users"
import {
  claimSeedWrite,
  ensureNamespaceState,
  finalizeSeedWriteFailure,
  finalizeSeedWriteSuccess,
} from "@/lib/memwal-namespace-state"

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini"
const RECALL_TOP_K = 5
const MANUAL_CACHE_TTL_MS = 10 * 60 * 1000
const MANUAL_CACHE_MAX_SIZE = 200
const DEFAULT_MEMWAL_NAMESPACE = "bias-web-chat"

type ImportanceLevel = "HIGH" | "MED" | "LOW"
type ImportanceSource = "llm" | "fallback_rule" | "guardrail"

type CharacterPayload = {
  name?: string
  display_name?: string
  age?: number
  job?: string
  nativeLanguage?: string
  narrative?: string
  background?: string
  family?: string
  mbti?: string
  height?: string
  traits?: string
  textingStyle?: string
  likes?: string[]
  dislikes?: string[]
  hidden?: string
  bannedTopics?: string[]
  firstSituation?: string
  affinityStart?: number
  ownerId?: string
  chatCharacterId?: string
  speechHabits?: string
}

type BiasChatMessageResponse = {
  bubbles?: string[]
  emotion?: string
  importance?: ImportanceLevel
  importance_source?: string
  closeness_delta?: number
  closeness_total?: number
  namespace?: string
  recall_hits?: number
  recall_status?: string
  memwal_status?: string
  level?: {
    num: number
    name: string
    address: string
    tone: string
  }
}

type LlmJson = {
  bubbles?: string[]
  emotion?: string
  closeness_delta?: number
  importance?: ImportanceLevel
  importance_reason?: string
}

type ManualClientEntry = {
  client: MemWalManual
  lastUsedAt: number
}

const manualClientCache = new Map<string, ManualClientEntry>()

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}

function currentNetwork(): "mainnet" | "testnet" {
  return process.env.NEXT_PUBLIC_SUI_NETWORK === "mainnet"
    ? "mainnet"
    : "testnet"
}

function fullnodeUrl(network: "mainnet" | "testnet"): string {
  return network === "mainnet"
    ? "https://fullnode.mainnet.sui.io:443"
    : "https://fullnode.testnet.sui.io:443"
}

function trimCache(now: number) {
  for (const [accountId, entry] of manualClientCache.entries()) {
    if (now - entry.lastUsedAt > MANUAL_CACHE_TTL_MS) {
      entry.client.destroy()
      manualClientCache.delete(accountId)
    }
  }
  if (manualClientCache.size <= MANUAL_CACHE_MAX_SIZE) return
  const oldest = [...manualClientCache.entries()].sort(
    (a, b) => a[1].lastUsedAt - b[1].lastUsedAt
  )
  const dropCount = manualClientCache.size - MANUAL_CACHE_MAX_SIZE
  oldest.slice(0, dropCount).forEach(([accountId, entry]) => {
    entry.client.destroy()
    manualClientCache.delete(accountId)
  })
}

function getManualClient(accountId: string): MemWalManual {
  const now = Date.now()
  trimCache(now)
  const cached = manualClientCache.get(accountId)
  if (cached) {
    cached.lastUsedAt = now
    return cached.client
  }

  const network = currentNetwork()
  const suiClient = new SuiJsonRpcClient({
    url: fullnodeUrl(network),
    network,
  })
  const client = MemWalManual.create({
    key: requireEnv("MEMWAL_PRIVATE_KEY"),
    serverUrl:
      process.env.MEMWAL_RELAYER_URL?.trim() ||
      process.env.MEMWAL_SERVER_URL?.trim() ||
      "https://relayer.staging.memwal.ai",
    suiPrivateKey: requireEnv("SERVER_SUI_PRIVATE_KEY"),
    embeddingApiKey: requireEnv("OPENAI_API_KEY"),
    packageId: requireEnv("MEMWAL_PACKAGE_ID"),
    accountId,
    namespace: DEFAULT_MEMWAL_NAMESPACE,
    suiNetwork: network,
    suiClient,
  })
  manualClientCache.set(accountId, { client, lastUsedAt: now })
  return client
}

function inferImportance(text: string, bubbles: string[]): ImportanceLevel {
  const joined = `${text}\n${bubbles.join("\n")}`.toLowerCase()
  const high = [
    "기억",
    "약속",
    "비밀",
    "좋아해",
    "싫어해",
    "important",
    "remember",
    "promise",
    "my name is",
  ]
  const med = ["오늘", "내일", "시험", "일정", "취향", "hobby", "work"]
  if (high.some((token) => joined.includes(token))) return "HIGH"
  if (med.some((token) => joined.includes(token))) return "MED"
  return "LOW"
}

function importanceRank(value: ImportanceLevel): number {
  if (value === "HIGH") return 3
  if (value === "MED") return 2
  return 1
}

function isImportanceLevel(value: unknown): value is ImportanceLevel {
  return value === "HIGH" || value === "MED" || value === "LOW"
}

function pickImportance(
  llmImportance: unknown,
  fallbackImportance: ImportanceLevel
): { importance: ImportanceLevel; source: ImportanceSource } {
  if (!isImportanceLevel(llmImportance)) {
    return { importance: fallbackImportance, source: "fallback_rule" }
  }

  // Guardrail: 룰 기반이 더 높은 중요도로 잡히면 상향 보정한다.
  if (importanceRank(fallbackImportance) > importanceRank(llmImportance)) {
    return { importance: fallbackImportance, source: "guardrail" }
  }

  return { importance: llmImportance, source: "llm" }
}

function toNamespace(
  roomId: string,
  characterId: string,
  userAddress: string
): string {
  return `room:${roomId}:char:${characterId}:user:${userAddress}`
}

function toSessionId(seed: string): number {
  // 32-bit FNV-1a hash, constrained to positive signed int range.
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) & 0x7fffffff
}

function safeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0
  )
}

function buildPersona(
  characterId: string,
  character: CharacterPayload | undefined
): string {
  const name =
    character?.name?.trim() || character?.display_name?.trim() || characterId
  const lines: string[] = [`- Name: ${name}`]
  if (typeof character?.age === "number") lines.push(`- Age: ${character.age}`)
  if (character?.job) lines.push(`- Job: ${character.job}`)
  if (character?.nativeLanguage)
    lines.push(`- Native language: ${character.nativeLanguage}`)
  if (character?.narrative) lines.push(`- Narrative: ${character.narrative}`)
  if (character?.background) lines.push(`- Background: ${character.background}`)
  if (character?.family) lines.push(`- Family: ${character.family}`)
  if (character?.mbti) lines.push(`- MBTI: ${character.mbti}`)
  if (character?.height) lines.push(`- Height: ${character.height}`)
  if (character?.traits) lines.push(`- Traits: ${character.traits}`)
  if (character?.speechHabits)
    lines.push(`- Speech habits: ${character.speechHabits}`)
  if (character?.textingStyle)
    lines.push(`- Texting style: ${character.textingStyle}`)
  const likes = safeArray(character?.likes)
  const dislikes = safeArray(character?.dislikes)
  const banned = safeArray(character?.bannedTopics)
  if (likes.length) lines.push(`- Likes: ${likes.join(", ")}`)
  if (dislikes.length) lines.push(`- Dislikes: ${dislikes.join(", ")}`)
  if (character?.hidden) lines.push(`- Hidden: ${character.hidden}`)
  if (banned.length) lines.push(`- Banned topics: ${banned.join(", ")}`)
  if (character?.firstSituation)
    lines.push(`- First situation: ${character.firstSituation}`)
  if (typeof character?.affinityStart === "number")
    lines.push(`- Affinity start: ${character.affinityStart}`)
  if (character?.ownerId) lines.push(`- Owner id: ${character.ownerId}`)
  if (character?.chatCharacterId)
    lines.push(`- Chat character id: ${character.chatCharacterId}`)
  return lines.join("\n")
}

async function recallMemories(
  namespace: string,
  query: string,
  accountId: string
): Promise<{ texts: string[]; status: string; detail: string }> {
  try {
    const client = getManualClient(accountId)
    const result = await client.recallManual(query, {
      limit: RECALL_TOP_K,
      namespace,
    })
    console.log("recall: ", result)
    const texts: string[] = []
    for (const hit of result.results) {
      if (typeof hit === "object" && hit && "text" in hit) {
        const maybe = hit as { text?: unknown }
        if (typeof maybe.text === "string" && maybe.text.trim()) {
          texts.push(maybe.text.trim())
        }
      }
    }
    return { texts, status: "ok", detail: "" }
  } catch (error) {
    manualClientCache.get(accountId)?.client.destroy()
    manualClientCache.delete(accountId)
    return {
      texts: [],
      status: "failed",
      detail: error instanceof Error ? error.message : "unknown",
    }
  }
}

async function rememberTurn(
  namespace: string,
  accountId: string,
  importance: ImportanceLevel,
  text: string
): Promise<{ status: string; detail: string }> {
  if (importance === "LOW") return { status: "skipped", detail: "" }
  try {
    console.log("remember: ", text)
    const client = getManualClient(accountId)
    await client.rememberManual(text, namespace)
    return { status: "stored", detail: "" }
  } catch (error) {
    manualClientCache.get(accountId)?.client.destroy()
    manualClientCache.delete(accountId)
    return {
      status: "failed",
      detail: error instanceof Error ? error.message : "unknown",
    }
  }
}

async function writeNamespaceSeed(
  namespace: string,
  accountId: string,
  seedPayload: string
): Promise<{ status: "stored" | "failed"; detail: string }> {
  try {
    const client = getManualClient(accountId)
    await client.rememberManual(seedPayload, namespace)
    return { status: "stored", detail: "" }
  } catch (error) {
    manualClientCache.get(accountId)?.client.destroy()
    manualClientCache.delete(accountId)
    return {
      status: "failed",
      detail: error instanceof Error ? error.message : "unknown",
    }
  }
}

async function callLlm(
  systemPrompt: string,
  history: string,
  text: string
): Promise<LlmJson> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is required")

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            `${systemPrompt}\n\n` +
            "Return JSON with keys: bubbles(string[] max 3), emotion(string), closeness_delta(number -3..3), importance(enum: HIGH|MED|LOW), importance_reason(string <= 120 chars).",
        },
        {
          role: "user",
          content: `[History]\n${history}\n\n[User message]\n${text}`,
        },
      ],
    }),
  })
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    error?: unknown
  }
  if (!response.ok) {
    throw new Error(JSON.stringify(payload.error ?? payload))
  }
  const raw = payload.choices?.[0]?.message?.content
  if (!raw) {
    return { bubbles: ["..."], emotion: "neutral", closeness_delta: 0 }
  }
  try {
    const parsed = JSON.parse(raw) as LlmJson
    const bubbles = Array.isArray(parsed.bubbles)
      ? parsed.bubbles.filter(
          (bubble): bubble is string => typeof bubble === "string"
        )
      : []
    return {
      bubbles: bubbles.length ? bubbles.slice(0, 3) : ["..."],
      emotion: typeof parsed.emotion === "string" ? parsed.emotion : "neutral",
      closeness_delta:
        typeof parsed.closeness_delta === "number" ? parsed.closeness_delta : 0,
      importance:
        typeof parsed.importance === "string"
          ? (parsed.importance.toUpperCase().trim() as ImportanceLevel)
          : undefined,
      importance_reason:
        typeof parsed.importance_reason === "string"
          ? parsed.importance_reason
          : undefined,
    }
  } catch {
    return { bubbles: [raw], emotion: "neutral", closeness_delta: 0 }
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId?: number
      text?: string
      roomId?: string
      userAddress?: string
      characterId?: string
      character?: CharacterPayload
    }

    const text = body.text?.trim()
    const roomId = body.roomId?.trim()
    const userAddress = body.userAddress?.trim()
    const characterId = body.characterId?.trim()

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 })
    }
    if (!roomId || !userAddress || !characterId) {
      return NextResponse.json(
        { error: "roomId, userAddress, characterId are required" },
        { status: 400 }
      )
    }

    const namespace = toNamespace(roomId, characterId, userAddress)
    const sessionId =
      typeof body.sessionId === "number" && Number.isFinite(body.sessionId)
        ? Math.trunc(body.sessionId)
        : toSessionId(namespace)
    const user = await getUser(userAddress)
    const accountId = user?.memwal_account_id?.trim()
    const persona = buildPersona(characterId, body.character)

    try {
      await ensureNamespaceState(namespace, sessionId)
    } catch (error) {
      console.error("[chat/message] ensureNamespaceState failed:", error)
    }

    if (accountId) {
      let claimedSeed = false
      try {
        claimedSeed = await claimSeedWrite(namespace, sessionId)
        if (claimedSeed) {
          const seedPayload =
            "[Seed Type]\nnamespace_bootstrap\n\n" +
            `[Namespace]\n${namespace}\n\n` +
            "[Character Persona]\n" +
            persona
          const seedFingerprint = createHash("sha256")
            .update(seedPayload)
            .digest("hex")
          const seedResult = await writeNamespaceSeed(
            namespace,
            accountId,
            seedPayload
          )
          if (seedResult.status === "stored") {
            await finalizeSeedWriteSuccess(namespace, seedFingerprint, sessionId)
          } else {
            await finalizeSeedWriteFailure(namespace, seedResult.detail, sessionId)
          }
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : "unknown"
        console.error("[chat/message] seed write flow failed:", error)
        if (claimedSeed) {
          try {
            await finalizeSeedWriteFailure(namespace, detail, sessionId)
          } catch (finalizeError) {
            console.error(
              "[chat/message] finalizeSeedWriteFailure failed:",
              finalizeError
            )
          }
        }
      }
    }

    const messages = await listMessages(roomId)
    const history = messages
      .slice(-30)
      .map((msg) => {
        if (msg.sender.type === "user") {
          return `user(${msg.sender.address}): ${msg.text}`
        }
        if (msg.sender.characterId === characterId) {
          return `assistant(self:${characterId}): ${msg.text}`
        }
        return `character(${msg.sender.characterId}): ${msg.text}`
      })
      .join("\n")

    let recalled: string[] = []
    let recallStatus = "skipped"
    let recallDetail = ""
    if (accountId) {
      const recalledResult = await recallMemories(namespace, text, accountId)
      recalled = recalledResult.texts
      recallStatus = recalledResult.status
      recallDetail = recalledResult.detail
    } else {
      recallStatus = "no_account"
      recallDetail = "missing memwal account id"
    }

    const recalledBlock = recalled.length
      ? recalled.map((item, idx) => `${idx + 1}. ${item}`).join("\n")
      : "- none"
    const systemPrompt =
      "You are role-playing the character profile below. Stay in-character.\n" +
      `Your speaker identity is assistant(self:${characterId}).\n` +
      "Lines starting with character(...) are other participants, not you.\n" +
      "Never speak for other characters and never merge identities.\n\n" +
      "[Character Persona]\n" +
      `${persona}\n\n` +
      "[Recalled Memories]\n" +
      `${recalledBlock}`

    const llm = await callLlm(systemPrompt, history, text)
    const bubbles = Array.isArray(llm.bubbles) ? llm.bubbles : ["..."]
    const fallbackImportance = inferImportance(text, bubbles)
    const { importance, source: importanceSource } = pickImportance(
      llm.importance,
      fallbackImportance
    )

    let memwalStatus = "skipped"
    let memwalDetail = ""
    if (accountId) {
      const remember = await rememberTurn(
        namespace,
        accountId,
        importance,
        `user(${userAddress}): ${text}\nassistant(self:${characterId}): ${bubbles.join(" | ")}`
      )
      memwalStatus = remember.status
      memwalDetail = remember.detail
    } else {
      memwalStatus = "no_account"
      memwalDetail = "missing memwal account id"
    }

    const payload: BiasChatMessageResponse = {
      bubbles,
      emotion: typeof llm.emotion === "string" ? llm.emotion : "neutral",
      closeness_delta:
        typeof llm.closeness_delta === "number" ? llm.closeness_delta : 0,
      closeness_total: 0,
      importance,
      importance_source: importanceSource,
      namespace,
      recall_hits: recalled.length,
      recall_status: recallStatus,
      memwal_status: memwalStatus,
      level: undefined,
    }

    return NextResponse.json({
      bubbles: payload.bubbles ?? [],
      emotion: payload.emotion ?? "neutral",
      importance: payload.importance ?? "LOW",
      importanceSource:
        typeof payload.importance_source === "string"
          ? payload.importance_source
          : "unknown",
      closenessDelta: payload.closeness_delta ?? 0,
      closenessTotal: payload.closeness_total ?? 0,
      namespace: payload.namespace ?? null,
      recallHits:
        typeof payload.recall_hits === "number" ? payload.recall_hits : 0,
      recallStatus:
        typeof payload.recall_status === "string"
          ? payload.recall_status
          : "unknown",
      recallDetail,
      memwalStatus:
        typeof payload.memwal_status === "string"
          ? payload.memwal_status
          : "unknown",
      memwalDetail,
      level: payload.level ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "failed to send message",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    )
  }
}
