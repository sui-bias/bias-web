"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, MoreVertical, SendHorizonal } from "lucide-react"
import { AppHeader } from "@/components/app-header"

type ChatRole = "user" | "assistant"

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
}

type CharacterChatRoomProps = {
  characterId: string
  characterName: string
  characterSource: string
}

type SessionApiResponse = {
  sessionId: number
  messages: Array<{
    id: number
    role: "user" | "assistant"
    content: string
  }>
}

type MessageApiResponse = {
  bubbles: string[]
}

function toUiMessages(messages: SessionApiResponse["messages"]): ChatMessage[] {
  return messages.flatMap((message) => {
    const bubbles =
      message.role === "assistant"
        ? message.content
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
        : [message.content]

    return bubbles.map((content, index) => ({
      id: `${message.id}-${index}`,
      role: message.role,
      content,
    }))
  })
}

export function CharacterChatRoom({
  characterId,
  characterName,
  characterSource,
}: CharacterChatRoomProps) {
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isBooting, setIsBooting] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false

    const initSession = async () => {
      try {
        setIsBooting(true)
        setError(null)

        const response = await fetch("/api/chat/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ characterId }),
        })
        const payload = (await response.json()) as
          | SessionApiResponse
          | { error?: string }

        if (!response.ok || !("sessionId" in payload)) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "failed to initialize session"
          )
        }

        if (cancelled) return
        setSessionId(payload.sessionId)
        setMessages(toUiMessages(payload.messages))
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "Failed to load session.")
      } finally {
        if (!cancelled) {
          setIsBooting(false)
        }
      }
    }

    void initSession()

    return () => {
      cancelled = true
    }
  }, [characterId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, isBooting, isSending])

  const canSend = useMemo(
    () => Boolean(sessionId && input.trim() && !isSending && !isBooting),
    [input, isBooting, isSending, sessionId]
  )

  async function handleSend() {
    const text = input.trim()
    if (!sessionId || !text || isSending) return

    const optimisticUserMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    }
    setMessages((prev) => [...prev, optimisticUserMessage])
    setInput("")
    setError(null)
    setIsSending(true)

    try {
      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, text }),
      })
      const payload = (await response.json()) as
        | MessageApiResponse
        | { error?: string }

      if (!response.ok || !("bubbles" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "failed to send message"
        )
      }

      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms))

      for (const [index, bubble] of payload.bubbles.entries()) {
        const delay = 1000 + Math.floor(Math.random() * 1000) // 1000~1999ms
        await sleep(delay)

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}-${index}`,
            role: "assistant",
            content: bubble,
          },
        ])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col pt-4">
      <AppHeader
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
              {characterName}
            </p>
            <p className="text-xs text-grey-500 dark:text-grey-400">
              {characterSource}
            </p>
          </div>
        }
        right={
          <button
            aria-label="Chat options"
            className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
          >
            <MoreVertical size={18} />
          </button>
        }
      />

      <section className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-24">
        <div className="flex justify-center">
          <span className="rounded-full bg-grey-100 px-3 py-1 text-xs text-grey-500 dark:bg-grey-800 dark:text-grey-400">
            Today
          </span>
        </div>

        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "assistant"
                ? "flex justify-start"
                : "flex justify-end"
            }
          >
            <div
              className={
                message.role === "assistant"
                  ? "max-w-[85%] rounded-2xl rounded-tl-md bg-grey-100 px-4 py-3 text-sm text-grey-900 dark:bg-grey-800 dark:text-grey-100"
                  : "max-w-[85%] rounded-2xl rounded-tr-md bg-brand px-4 py-3 text-sm text-white"
              }
            >
              {message.content}
            </div>
          </div>
        ))}

        {isBooting ? (
          <p className="text-center text-xs text-grey-500 dark:text-grey-400">
            Preparing your session…
          </p>
        ) : null}
        {/* {isSending ? (
          <p className="text-center text-xs text-grey-500 dark:text-grey-400">
            Generating a reply…
          </p>
        ) : null} */}
        {error ? (
          <p className="text-center text-xs text-red-500 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <div ref={bottomRef} />
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void handleSend()
        }}
        className="fixed right-0 bottom-4 left-0 mx-auto w-full max-w-md bg-white px-4 py-3 dark:bg-grey-900"
      >
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`Send a message to ${characterName}`}
            className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-grey-200 bg-grey-50 px-3 py-2.5 text-sm text-grey-900 outline-none focus:border-brand dark:border-grey-700 dark:bg-grey-800 dark:text-white"
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={!canSend}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white transition-opacity active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SendHorizonal size={18} />
          </button>
        </div>
      </form>
    </div>
  )
}
