"use client"

import { use, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CircleMinus,
  MoreVertical,
  SendHorizonal,
  UserPlus,
} from "lucide-react"
import { useCurrentUser } from "@/hooks/use-current-user"
import { getCharacter } from "@/lib/mock"
import { addFriend, isFriend } from "@/lib/friends"
import { addMessage, getRoom, listMessages } from "@/lib/rooms"
import { getUser, type UserRow } from "@/lib/users"
import type { Message, Room, SenderRef } from "@/lib/types"
import { AppHeader } from "@/components/app-header"

function senderName(sender: SenderRef, myAddress: string | null): string {
  if (sender.type === "character") {
    return getCharacter(sender.characterId)?.display_name ?? "캐릭터"
  }
  if (myAddress && sender.address === myAddress) return "나"
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
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export default function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { address } = useCurrentUser()

  const [room, setRoom] = useState<Room | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [otherUser, setOtherUser] = useState<UserRow | null>(null)
  const [otherFriend, setOtherFriend] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

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

  // direct 유저-유저 방이면 상대 유저 정보 + 친구 여부 로드(친구추가/차단 박스용)
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
    // TODO: 차단 테이블/정책 필요. 현재는 안내만.
    alert("차단 기능은 준비 중입니다.")
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || !address || sending) return
    setSending(true)
    setInput("")
    try {
      await addMessage(id, { type: "user", address }, text)
      await refresh()

      // direct 방 + 채팅 가능 캐릭터 → bias-chat 으로 응답 받아 저장
      const charP = room?.participants.find((p) => p.type === "character")
      const character =
        charP?.type === "character"
          ? getCharacter(charP.characterId)
          : undefined
      if (room?.type === "direct" && character?.chatCharacterId) {
        let sid = sessionId
        if (sid == null) {
          const sres = await fetch("/api/chat/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ characterId: character.chatCharacterId }),
          })
          const sjson = await sres.json()
          if (!sres.ok) throw new Error(sjson?.error ?? "session failed")
          sid = sjson.sessionId as number
          setSessionId(sid)
        }
        const mres = await fetch("/api/chat/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid, text }),
        })
        const mjson = await mres.json()
        if (
          mres.ok &&
          Array.isArray(mjson.bubbles) &&
          charP?.type === "character"
        ) {
          const turnId = crypto.randomUUID()
          for (const bubble of mjson.bubbles as string[]) {
            await addMessage(
              id,
              { type: "character", characterId: charP.characterId },
              bubble,
              turnId
            )
          }
          await refresh()
        }
      }
    } catch {
      // bias-chat 미연결(로컬 5001 없음) 등 — 사용자 메시지는 이미 저장됨
    } finally {
      setSending(false)
    }
    // TODO: 캐릭터 자율 발화 — 백엔드 멀티 캐릭터 세션 나오면 여기서 트리거
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
          존재하지 않는 방입니다.
        </p>
        <Link href="/chat" className="text-sm font-semibold text-brand">
          채팅으로 돌아가기
        </Link>
      </div>
    )
  }

  const characters = room.participants.filter((p) => p.type === "character")

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <div className="tom-0 fixed mx-auto w-full max-w-md bg-white dark:bg-grey-900">
        <AppHeader
          className="pt-4 pb-2"
          left={
            <Link
              href="/chat"
              aria-label="채팅 목록으로 돌아가기"
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
                  : `참여자 ${room.participants.length} · 캐릭터 ${
                      characters
                        .map((c) =>
                          c.type === "character"
                            ? (getCharacter(c.characterId)?.display_name ?? "?")
                            : ""
                        )
                        .join(", ") || "없음"
                    }`}
              </p>
            </div>
          }
          right={
            <button
              aria-label="채팅 옵션"
              className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
            >
              <MoreVertical size={18} />
            </button>
          }
        />

        {/* 유저-유저 방: 아직 친구 아니면 친구추가/차단 박스 */}
        {otherUser && !otherFriend ? (
          <div className="flex items-center justify-between gap-3 border-b border-grey-200 bg-grey-50 px-4 py-2.5 dark:border-grey-800 dark:bg-grey-800/50">
            <p className="min-w-0 truncate text-xs text-grey-600 dark:text-grey-300">
              {otherUser.display_name}님과의 새 대화예요.
            </p>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={handleAddFriend}
                className="flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-white"
              >
                <UserPlus size={14} /> 친구 추가
              </button>
              <button
                type="button"
                onClick={handleBlock}
                className="flex items-center gap-1 rounded-lg border border-grey-300 px-2.5 py-1 text-xs font-semibold text-grey-600 dark:border-grey-600 dark:text-grey-300"
              >
                <CircleMinus size={14} />
                차단
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* 메시지 */}
      <div
        className={`flex-1 space-y-2 overflow-y-auto px-4 pb-20 ${otherUser && !otherFriend ? "pt-32" : "pt-10"}`}
      >
        {messages.length === 0 ? (
          <p className="py-10 text-center text-xs text-grey-400 dark:text-grey-500">
            첫 메시지를 보내보세요.
          </p>
        ) : (
          messages.map((m, index) => {
            const mine =
              m.sender.type === "user" && m.sender.address === address
            const prev = messages[index - 1]
            const showSenderName = !prev || !isSameSender(prev.sender, m.sender)

            const avatarUrl =
              m.sender.type === "character"
                ? getCharacter(m.sender.characterId)?.imageUrl
                : otherUser && m.sender.address === otherUser.address
                  ? (otherUser.image_url ?? undefined)
                  : undefined

            const avatarFallback = senderName(m.sender, address).slice(0, 1)

            return mine ? (
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
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-grey-200 text-sm font-medium text-grey-700 dark:bg-grey-700 dark:text-grey-100">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={senderName(m.sender, address)}
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
                      {senderName(m.sender, address)}
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
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력 */}
      <div className="fixed right-0 bottom-0 left-0 mx-auto w-full max-w-md border-2 bg-white px-4 py-3 dark:bg-grey-900">
        <div className="flex items-end gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend()
            }}
            placeholder={address ? "메시지 입력" : "지갑 연결 후 전송 가능"}
            disabled={!address}
            className="h-10 w-full rounded-full border border-grey-200 bg-grey-100 px-4 text-sm text-grey-900 outline-none focus:border-brand disabled:opacity-60 dark:border-grey-700 dark:bg-grey-800 dark:text-white"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || !address || sending}
            aria-label="전송"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-40"
          >
            <SendHorizonal size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
