import Link from "next/link"
import { ArrowLeft, MessageCircle } from "lucide-react"
import { Button } from "./ui/button"

type ProfileDetailViewProps = {
  id: string
  source: "profile" | "group"
}

export function ProfileDetailView({ id, source }: ProfileDetailViewProps) {
  return (
    <div className="space-y-5">
      <section className="overflow-hidden bg-white dark:border-grey-700 dark:bg-grey-800">
        <div className="relative aspect-[3/4] bg-gradient-to-br from-violet-300 via-fuchsia-400 to-indigo-500">
          <Link
            href={`/${source === "group" ? "open-chat" : "list"}`}
            className="absolute top-5 left-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
            aria-label="뒤로 가기"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="absolute bottom-4 left-4 flex flex-col gap-2">
            <div className="flex size-14 flex-col items-center justify-center rounded-xl bg-yellow-300 text-sm font-semibold text-grey-900">
              9
            </div>
            <p className="text-2xl font-bold text-white">9oodam</p>
          </div>
          <Button
            variant="outline"
            className="absolute right-4 bottom-4 rounded-md"
          >
            <MessageCircle />
            {source === "group" ? <>Group Chat</> : <>1:1 Chat</>}
          </Button>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-sm text-grey-600 dark:text-grey-300">
            상세 프로필 화면 설명.
          </p>
          <div className="rounded-xl bg-grey-100 p-3 text-xs text-grey-700 dark:bg-grey-700/70 dark:text-grey-200">
            뭐넣을까 지갑 주소? 캐릭터면 설정 내용
          </div>
        </div>
      </section>
    </div>
  )
}
