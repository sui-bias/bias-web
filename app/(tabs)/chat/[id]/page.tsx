import Link from "next/link"
import { ArrowLeft, Plus, Send } from "lucide-react"

// ⚠️ 와이어프레임 전용 화면. 실제 1:1 채팅 로직은 별도 담당자가 구현한다.
// 라우팅 계약:
//  - 기존 방: /chat/{roomId}
//  - 새 1:1:  /chat/new?characterId={id}  (id === "new" 처리는 담당자가 교체)
// docs/DEVELOPMENT.md §6 M3 참고.

type Bubble = { from: "them" | "me"; text: string }

const SAMPLE: Bubble[] = [
  {
    from: "them",
    text: "안녕! 아까 프로젝트 단톡에서 연락처 교환한 피터야. 잘 부탁해!",
  },
  { from: "me", text: "안녕하세요! 저야말로 잘 부탁드려요 ㅎㅎ" },
  { from: "them", text: "혹시 이번 주말에 시간 괜찮아? 자료 같이 정리하면 좋을 것 같아서" },
  { from: "me", text: "좋아요, 토요일 오후 어때요?" },
]

export default function ChatRoomPage() {
  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col">
      {/* 헤더 */}
      <header className="flex items-center gap-3 border-b border-grey-200 px-3 py-3 dark:border-grey-800">
        <Link
          href="/chat"
          aria-label="채팅 목록으로"
          className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="size-9 rounded-full bg-gradient-to-br from-violet-300 to-indigo-500" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-grey-900 dark:text-white">
            Peter Parker
          </p>
          <p className="truncate text-xs text-grey-500 dark:text-grey-400">
            대화 중
          </p>
        </div>
      </header>

      {/* 메시지 영역 */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <div className="flex justify-center">
          <span className="rounded-full bg-grey-100 px-3 py-1 text-[11px] text-grey-500 dark:bg-grey-800 dark:text-grey-400">
            2026년 6월 18일
          </span>
        </div>

        {SAMPLE.map((bubble, index) =>
          bubble.from === "them" ? (
            <div key={index} className="flex max-w-[78%] flex-col gap-1">
              <div className="rounded-2xl rounded-tl-sm bg-grey-100 px-3.5 py-2 text-sm text-grey-900 dark:bg-grey-800 dark:text-grey-100">
                {bubble.text}
              </div>
            </div>
          ) : (
            <div key={index} className="ml-auto flex max-w-[78%] flex-col gap-1">
              <div className="rounded-2xl rounded-tr-sm bg-brand px-3.5 py-2 text-sm text-white">
                {bubble.text}
              </div>
            </div>
          )
        )}

        {/* TODO: 실제 채팅 로직 — 메시지 송수신/응답 상태/스트리밍 (타 담당) */}
      </div>

      {/* 입력 바 (정적) */}
      <div className="flex items-center gap-2 border-t border-grey-200 px-3 py-3 dark:border-grey-800">
        <button
          type="button"
          disabled
          aria-label="첨부"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-grey-400"
        >
          <Plus size={20} />
        </button>
        <input
          disabled
          placeholder="메시지 입력 (와이어프레임)"
          className="h-10 w-full rounded-full border border-grey-200 bg-grey-100 px-4 text-sm text-grey-900 outline-none dark:border-grey-700 dark:bg-grey-800 dark:text-white"
        />
        <button
          type="button"
          disabled
          aria-label="전송"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
