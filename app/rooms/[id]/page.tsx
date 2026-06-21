"use client"

import { use, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowDownToLine,
  ArrowLeft,
  CircleMinus,
  LogOut,
  MoreVertical,
  SendHorizonal,
  UserPlus,
} from "lucide-react"
import { useCurrentUser } from "@/hooks/use-current-user"
import { getCharacter } from "@/lib/characters"
import { addFriend, isFriend } from "@/lib/friends"
import {
  addMessage,
  getRoom,
  leaveRoomForUser,
  listMessages,
} from "@/lib/rooms"
import { getUser, type UserRow } from "@/lib/users"
import type {
  Character,
  Message,
  Participant,
  Room,
  SenderRef,
} from "@/lib/types"
import { AppHeader } from "@/components/app-header"

const CHARACTER_BUBBLE_DELAY_MS = 1400
type CharacterParticipant = Extract<Participant, { type: "character" }>

function senderName(
  sender: SenderRef,
  myAddress: string | null,
  characterById: Record<string, Character>
): string {
  if (sender.type === "character") {
    return characterById[sender.characterId]?.display_name ?? "Character"
  }
  if (myAddress && sender.address === myAddress) return "You"
  return `${sender.address.slice(0, 6)}…`
}

function isSameSender(a: SenderRef, b: SenderRef): boolean {
  if (a.type !== b.type) return false
  if (a.type === "character" && b.type === "character") {
    return a.characterId === b.characterId
  }
  if (a.type === "user" && b.type === "user") {
    return a.address === b.address
  }
  return false
}

function formatMessageTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(d)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "")
}

function characterNameTokens(
  participant: CharacterParticipant,
  characterById: Record<string, Character>
): string[] {
  const displayName = characterById[participant.characterId]?.display_name ?? ""
  const splitNames = displayName
    .split(/[\s_\-./]+/)
    .map((name) => name.trim())
    .filter(Boolean)
  return [...new Set([displayName, participant.characterId, ...splitNames])]
}

function pickResponders(input: {
  text: string
  characterParticipants: CharacterParticipant[]
  characterById: Record<string, Character>
  messages: Message[]
}): CharacterParticipant[] {
  const { text, characterParticipants, characterById, messages } = input
  if (!characterParticipants.length) return []

  const normalizedText = normalizeText(text)
  const explicitlyCalled = characterParticipants.filter((participant) => {
    const tokens = characterNameTokens(participant, characterById)
    return tokens.some((token) => {
      const normalizedToken = normalizeText(token)
      return (
        normalizedToken.length > 1 && normalizedText.includes(normalizedToken)
      )
    })
  })
  if (explicitlyCalled.length) return explicitlyCalled

  const recentCharacterMessages = [...messages]
    .reverse()
    .filter((message) => message.sender.type === "character")
  const recentCharacterId =
    recentCharacterMessages[0]?.sender.type === "character"
      ? recentCharacterMessages[0].sender.characterId
      : null

  const looksDirected =
    /[?？]/.test(text) ||
    /(야|아)[\s!,.?~]*$/u.test(text.trim()) ||
    /\b(can you|could you|tell me|what|why|how)\b/i.test(text)

  if (looksDirected && recentCharacterId) {
    const recentCharacter = characterParticipants.find(
      (participant) => participant.characterId === recentCharacterId
    )
    if (recentCharacter) return [recentCharacter]
  }

  // 연속 발화를 줄이기 위해 직전 캐릭터를 기본 후보군에서 제외한다.
  const pool =
    recentCharacterId && characterParticipants.length > 1
      ? characterParticipants.filter(
          (participant) => participant.characterId !== recentCharacterId
        )
      : characterParticipants

  const recentFromPool = recentCharacterMessages.find((message) =>
    pool.some(
      (participant) =>
        message.sender.type === "character" &&
        participant.characterId === message.sender.characterId
    )
  )
  if (recentFromPool && recentFromPool.sender.type === "character") {
    const recentCharacterFromPoolId = recentFromPool.sender.characterId
    const picked = pool.find(
      (participant) => participant.characterId === recentCharacterFromPoolId
    )
    if (picked) return [picked]
  }

  return [pool[Math.floor(Math.random() * pool.length)]]
}

export default function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { address } = useCurrentUser()
  const router = useRouter()

  const [room, setRoom] = useState<Room | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [typingCharacterId, setTypingCharacterId] = useState<string | null>(
    null
  )
  const [sessionByCharacterId, setSessionByCharacterId] = useState<
    Record<string, number>
  >({})
  const [otherUser, setOtherUser] = useState<UserRow | null>(null)
  const [otherFriend, setOtherFriend] = useState(false)
  const [characterById, setCharacterById] = useState<Record<string, Character>>(
    {}
  )
  const [optionsOpen, setOptionsOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const firstMessageBootstrappedRef = useRef(false)
  const optionsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    firstMessageBootstrappedRef.current = false
  }, [id])

  const refresh = useCallback(async () => {
    const [r, msgs] = await Promise.all([getRoom(id), listMessages(id)])
    setRoom(r)
    setMessages(msgs)
    setLoading(false)
  }, [id])

  useEffect(() => {
    // 비동기 데이터 패칭(정당). setState는 await 이후에만 일어남.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!optionsOpen) return

    const handleMouseDown = (event: MouseEvent) => {
      if (
        optionsRef.current &&
        !optionsRef.current.contains(event.target as Node)
      ) {
        setOptionsOpen(false)
      }
    }

    window.addEventListener("mousedown", handleMouseDown)
    return () => {
      window.removeEventListener("mousedown", handleMouseDown)
    }
  }, [optionsOpen])

  useEffect(() => {
    let cancelled = false
    const loadCharacters = async () => {
      if (!room) {
        setCharacterById({})
        return
      }

      const characterIds = [
        ...new Set(
          room.participants.flatMap((p) =>
            p.type === "character" ? [p.characterId] : []
          )
        ),
      ]

      if (!characterIds.length) {
        setCharacterById({})
        return
      }

      const entries = await Promise.all(
        characterIds.map(async (characterId) => {
          const character = await getCharacter(characterId)
          return [characterId, character] as const
        })
      )

      if (cancelled) return
      const next: Record<string, Character> = {}
      entries.forEach(([characterId, character]) => {
        if (character) next[characterId] = character
      })
      setCharacterById(next)
    }

    void loadCharacters()
    return () => {
      cancelled = true
    }
  }, [room])

  useEffect(() => {
    let cancelled = false
    const ensureFirstMessage = async () => {
      if (firstMessageBootstrappedRef.current) return
      if (!room || room.type !== "direct") return
      if (messages.length !== 0) return

      const charP = room.participants.find((p) => p.type === "character")
      if (!charP || charP.type !== "character") return

      let character = characterById[charP.characterId]
      if (!character) {
        const fetched = await getCharacter(charP.characterId)
        if (cancelled || !fetched) return
        character = fetched
        setCharacterById((prev) => ({ ...prev, [fetched.id]: fetched }))
      }
      const opening = character.firstMessage?.trim()
      if (!opening) return

      firstMessageBootstrappedRef.current = true
      try {
        await addMessage(
          id,
          { type: "character", characterId: charP.characterId },
          opening
        )
        await refresh()
      } catch {
        firstMessageBootstrappedRef.current = false
      }
    }
    void ensureFirstMessage()
    return () => {
      cancelled = true
    }
  }, [room, messages.length, characterById, id, refresh])

  // direct 유저-유저 방이면 상대 유저 정보 + 친구 여부 로드(친구추가/Block 박스용)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!room || !address) return
      const users = room.participants.filter((p) => p.type === "user")
      const hasChar = room.participants.some((p) => p.type === "character")
      const other = users.find(
        (p) => p.type === "user" && p.address !== address
      )
      if (room.type === "direct" && !hasChar && other?.type === "user") {
        const [u, f] = await Promise.all([
          getUser(other.address),
          isFriend(address, other.address),
        ])
        if (!cancelled) {
          setOtherUser(u)
          setOtherFriend(f)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [room, address])

  async function handleAddFriend() {
    if (!address || !otherUser) return
    await addFriend(address, otherUser.address)
    setOtherFriend(true)
  }

  function handleBlock() {
    // TODO: Block 테이블/정책 필요. 현재는 안내만.
    alert("Blocking is coming soon.")
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || !address || sending) return
    setSending(true)
    setInput("")
    try {
      await addMessage(id, { type: "user", address }, text)
      await refresh()

      // 방에 캐릭터가 있으면(direct/group 공통) 순서대로 응답 생성
      const characterParticipants = (room?.participants ?? []).filter(
        (participant): participant is CharacterParticipant =>
          participant.type === "character"
      )
      const responders = pickResponders({
        text,
        characterParticipants,
        characterById,
        messages,
      })

      for (const participant of responders) {
        try {
          setTypingCharacterId(participant.characterId)
          let character = characterById[participant.characterId]
          if (!character) {
            const fetched = await getCharacter(participant.characterId)
            if (!fetched) continue
            character = fetched
            setCharacterById((prev) => ({ ...prev, [fetched.id]: fetched }))
          }

          let sid = sessionByCharacterId[participant.characterId]
          if (sid == null) {
            const sres = await fetch("/api/chat/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                characterId: character.id,
                roomId: id,
                userAddress: address,
                character: {
                  name: character.display_name,
                  age: character.age,
                  job: character.job,
                  nativeLanguage: character.nativeLanguage,
                  narrative: character.narrative,
                  background: character.background,
                  family: character.family,
                  mbti: character.mbti,
                  height: character.height,
                  traits: character.traits,
                  textingStyle: character.textingStyle,
                  likes: character.likes,
                  dislikes: character.dislikes,
                  hidden: character.hidden,
                  bannedTopics: character.bannedTopics,
                  firstSituation: character.firstSituation,
                  affinityStart: character.affinityStart,
                  ownerId: character.ownerId,
                  chatCharacterId: character.chatCharacterId,
                  speechHabits: character.speechHabits,
                },
              }),
            })
            const sjson = await sres.json()
            if (!sres.ok) throw new Error(sjson?.error ?? "session failed")
            sid = sjson.sessionId as number
            setSessionByCharacterId((prev) => ({
              ...prev,
              [participant.characterId]: sid as number,
            }))
          }

          const mres = await fetch("/api/chat/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: sid,
              text,
              roomId: id,
              userAddress: address,
              characterId: character.id,
              character: {
                name: character.display_name,
                age: character.age,
                job: character.job,
                nativeLanguage: character.nativeLanguage,
                narrative: character.narrative,
                background: character.background,
                family: character.family,
                mbti: character.mbti,
                height: character.height,
                traits: character.traits,
                textingStyle: character.textingStyle,
                likes: character.likes,
                dislikes: character.dislikes,
                hidden: character.hidden,
                bannedTopics: character.bannedTopics,
                firstSituation: character.firstSituation,
                affinityStart: character.affinityStart,
                ownerId: character.ownerId,
                chatCharacterId: character.chatCharacterId,
                speechHabits: character.speechHabits,
              },
            }),
          })
          const mjson = await mres.json()
          if (!mres.ok || !Array.isArray(mjson.bubbles)) {
            setTypingCharacterId(null)
            continue
          }

          const turnId = crypto.randomUUID()
          const bubbles = mjson.bubbles as string[]
          setTypingCharacterId(null)
          for (let index = 0; index < bubbles.length; index += 1) {
            await addMessage(
              id,
              { type: "character", characterId: participant.characterId },
              bubbles[index],
              turnId
            )
            await refresh()
            if (index < bubbles.length - 1) {
              await sleep(CHARACTER_BUBBLE_DELAY_MS)
            }
          }
        } catch {
          // 한 캐릭터 생성/응답 실패가 전체 전송을 막지 않도록 한다.
          setTypingCharacterId(null)
        }
      }
    } catch {
      // bias-chat 미연결(로컬 5001 없음) 등 — 사용자 메시지는 이미 저장됨
    } finally {
      setTypingCharacterId(null)
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-white dark:bg-grey-900">
        <div className="size-6 animate-spin rounded-full border-2 border-grey-300 border-t-brand" />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center gap-3 bg-white p-6 dark:bg-grey-900">
        <p className="text-sm text-grey-500 dark:text-grey-400">
          Room not found.
        </p>
        <Link href="/chat" className="text-sm font-semibold text-brand">
          Back to chat
        </Link>
      </div>
    )
  }

  const characters = room.participants.filter((p) => p.type === "character")
  const myCharacters = characters.filter(
    (p) => p.type === "character" && address && p.ownerAddress === address
  )
  const canExportMemwal = myCharacters.length > 0

  async function handleLeaveRoom() {
    if (!address) return
    setOptionsOpen(false)

    const confirmed = window.confirm("Leave this room?")
    if (!confirmed) return

    try {
      await leaveRoomForUser(id, address)
      router.replace("/chat")
    } catch {
      alert("Failed to leave the room.")
    }
  }

  async function handleExportMemwalInfo() {
    if (!address || !canExportMemwal) return
    setOptionsOpen(false)

    const user = await getUser(address)
    const accountId = user?.memwal_account_id?.trim() || "(none)"
    const namespaceLines = myCharacters.map(
      (participant, index) =>
        `namespace${index + 1}: room:${id}:char:${participant.characterId}:user:${address}`
    )
    const content = [`accountId: ${accountId}`, ...namespaceLines].join("\n")

    try {
      await navigator.clipboard.writeText(content)
      alert(`Copied to clipboard:\n\n${content}`)
    } catch {
      alert("Failed to get character information")
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col">
      {/* 헤더 */}
      <div className="top-0 fixed inset-x-0 mx-auto w-full max-w-md bg-white dark:bg-grey-900">
        <AppHeader
          className="pt-4 pb-2"
          left={
            <Link
              href="/chat"
              aria-label="Back to chats"
              className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
            >
              <ArrowLeft size={20} />
            </Link>
          }
          center={
            <div className="text-center">
              <p className="text-sm font-semibold text-grey-900 dark:text-white">
                {otherUser ? otherUser.display_name : room.name}
              </p>
              <p className="text-xs text-grey-500 dark:text-grey-400">
                {otherUser
                  ? `@${otherUser.username}`
                  : `Members ${room.participants.length} · Characters ${
                      characters
                        .map((c) =>
                          c.type === "character"
                            ? (characterById[c.characterId]?.display_name ??
                              "?")
                            : ""
                        )
                        .join(", ") || "None"
                    }`}
              </p>
            </div>
          }
          right={
            <div ref={optionsRef} className="relative">
              <button
                type="button"
                aria-label="Chat options"
                onClick={() => setOptionsOpen((prev) => !prev)}
                className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
              >
                <MoreVertical size={18} />
              </button>
              {optionsOpen ? (
                <div className="absolute top-11 right-0 z-30 w-56 rounded-xl border border-grey-200 bg-white p-1 shadow-lg dark:border-grey-700 dark:bg-grey-900">
                  <button
                    type="button"
                    onClick={handleLeaveRoom}
                    className="flex w-full items-center gap-1 rounded-lg px-3 py-2 text-left text-sm text-grey-900 transition-colors hover:bg-grey-100 dark:text-white dark:hover:bg-grey-800"
                  >
                    <LogOut size={14} />
                    leave room
                  </button>
                  {canExportMemwal ? (
                    <button
                      type="button"
                      onClick={handleExportMemwalInfo}
                      className="flex w-full items-center gap-1 rounded-lg px-3 py-2 text-left text-sm text-grey-900 transition-colors hover:bg-grey-100 dark:text-white dark:hover:bg-grey-800"
                    >
                      <ArrowDownToLine size={14} />
                      export character
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          }
        />

        {/* 유저-유저 방: 아직 친구 아니면 친구추가/Block 박스 */}
        {otherUser && !otherFriend ? (
          <div className="flex items-center justify-between gap-3 border-b border-grey-200 bg-grey-50 px-4 py-2.5 dark:border-grey-800 dark:bg-grey-800/50">
            <p className="min-w-0 truncate text-xs text-grey-600 dark:text-grey-300">
              {otherUser.display_name} — say hi to start chatting.
            </p>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={handleAddFriend}
                className="flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-white"
              >
                <UserPlus size={14} /> Add friend
              </button>
              <button
                type="button"
                onClick={handleBlock}
                className="flex items-center gap-1 rounded-lg border border-grey-300 px-2.5 py-1 text-xs font-semibold text-grey-600 dark:border-grey-600 dark:text-grey-300"
              >
                <CircleMinus size={14} />
                Block
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* 메시지 */}
      <div
        className={`flex-1 space-y-2 overflow-y-auto px-4 pb-18 ${otherUser && !otherFriend ? "pt-32" : "pt-18"}`}
      >
        {messages.length === 0 ? (
          <p className="py-10 text-center text-xs text-grey-400 dark:text-grey-500">
            Send the first message.
          </p>
        ) : (
          messages.map((m, index) => {
            const mine =
              m.sender.type === "user" && m.sender.address === address
            const prev = messages[index - 1]
            const showSenderName = !prev || !isSameSender(prev.sender, m.sender)
            const showDateDivider =
              !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt)

            const avatarUrl =
              m.sender.type === "character"
                ? characterById[m.sender.characterId]?.imageUrl
                : otherUser && m.sender.address === otherUser.address
                  ? (otherUser.image_url ?? undefined)
                  : undefined

            const avatarFallback = senderName(
              m.sender,
              address,
              characterById
            ).slice(0, 1)

            return (
              <div key={m.id}>
                {showDateDivider ? (
                  <div className="my-3 flex items-center justify-center">
                    <span className="rounded-full bg-grey-100 px-3 py-1 text-[11px] text-grey-500 dark:bg-grey-800 dark:text-grey-300">
                      {formatDayLabel(m.createdAt)}
                    </span>
                  </div>
                ) : null}

                {mine ? (
                  <div
                    key={m.id}
                    className="ml-auto flex flex-row-reverse items-end gap-1"
                  >
                    <div className="rounded-2xl rounded-tr-sm bg-brand px-4 py-3 text-sm text-white">
                      {m.text}
                    </div>
                    <p
                      className="flex-shrink-0 pl-1 text-right text-[10px] text-grey-500 dark:text-grey-400"
                      style={{
                        whiteSpace: "nowrap",
                        alignSelf: "flex-end",
                      }}
                    >
                      {formatMessageTime(m.createdAt)}
                    </p>
                  </div>
                ) : (
                  <div key={m.id} className="flex max-w-[88%] gap-2">
                    {showSenderName ? (
                      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-grey-200 text-sm font-medium text-grey-700 dark:bg-grey-700 dark:text-grey-100">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarUrl}
                            alt={senderName(m.sender, address, characterById)}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-xs font-semibold text-grey-700 dark:text-grey-100">
                            {avatarFallback}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="size-10" />
                    )}
                    <div className="min-w-0">
                      {showSenderName ? (
                        <p className="mb-0.5 text-[11px] text-grey-500 dark:text-grey-400">
                          {senderName(m.sender, address, characterById)}
                        </p>
                      ) : null}
                      <div className="ml-auto flex flex-row items-end gap-1">
                        <div className="rounded-2xl rounded-tl-sm bg-grey-100 px-4 py-3 text-sm text-grey-900 dark:bg-grey-800 dark:text-grey-100">
                          {m.text}
                        </div>
                        <p className="flex-shrink-0 text-right text-[10px] text-grey-500 dark:text-grey-400">
                          {formatMessageTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
        {typingCharacterId ? (
          <div className="flex max-w-[88%] gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-grey-200 text-sm font-medium text-grey-700 dark:bg-grey-700 dark:text-grey-100">
              {characterById[typingCharacterId]?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={characterById[typingCharacterId]?.imageUrl}
                  alt={
                    characterById[typingCharacterId]?.display_name ??
                    "Character"
                  }
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-xs font-semibold text-grey-700 dark:text-grey-100">
                  {(
                    characterById[typingCharacterId]?.display_name ?? "C"
                  ).slice(0, 1)}
                </div>
              )}
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-grey-100 px-4 py-3 text-sm text-grey-500 dark:bg-grey-800 dark:text-grey-300">
              <div
                className="bubble-row flex items-end justify-end gap-2"
                style={{ animationDelay: `${4 * 0.75}s` }}
              >
                <span className="mt-0.5 flex h-5 items-center gap-1">
                  <span className="dot">•</span>
                  <span className="dot dot-2">•</span>
                  <span className="dot dot-3">•</span>
                </span>
              </div>
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {/* 입력 */}
      <div className="fixed right-0 bottom-0 left-0 mx-auto w-full max-w-md bg-white px-4 py-3 dark:bg-grey-900">
        <div className="flex items-end gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend()
            }}
            placeholder={address ? "Type a message" : "Connect wallet to send"}
            disabled={!address}
            className="h-10 w-full rounded-full border border-grey-200 bg-grey-100 px-4 text-sm text-grey-900 outline-none focus:border-brand disabled:opacity-60 dark:border-grey-700 dark:bg-grey-800 dark:text-white"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || !address || sending}
            aria-label="Send"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-40"
          >
            <SendHorizonal size={18} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .dot {
          animation: typing 1s steps(1, end) infinite;
        }
        .dot-2 {
          animation-delay: 0.12s;
        }
        .dot-3 {
          animation-delay: 0.24s;
        }
        @keyframes typing {
          0%,
          100% {
            opacity: 0.25;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-1px);
          }
        }
      `}</style>
    </div>
  )
}
