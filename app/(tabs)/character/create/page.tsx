import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AppHeader } from "@/components/app-header"

export default function CharacterCreatePage() {
  return (
    <div className="space-y-4 pt-6">
      <AppHeader
        left={
          <Link
            href="/character"
            aria-label="캐릭터 목록으로 돌아가기"
            className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
          >
            <ArrowLeft size={20} />
          </Link>
        }
        title="Create Character"
      />

      <section className="space-y-4 rounded-2xl border border-grey-200 bg-white p-4 dark:border-grey-800 dark:bg-grey-900">
        <div className="space-y-2">
          <label
            htmlFor="name"
            className="text-xs font-semibold text-grey-600 dark:text-grey-300"
          >
            Name
          </label>
          <input
            id="name"
            placeholder="캐릭터 이름"
            className="h-11 w-full rounded-xl border border-grey-200 bg-white px-3 text-sm text-grey-900 outline-none focus:border-brand dark:border-grey-700 dark:bg-grey-800 dark:text-white"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="description"
            className="text-xs font-semibold text-grey-600 dark:text-grey-300"
          >
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            placeholder="캐릭터 소개"
            className="w-full rounded-xl border border-grey-200 bg-white px-3 py-2 text-sm text-grey-900 outline-none focus:border-brand dark:border-grey-700 dark:bg-grey-800 dark:text-white"
          />
        </div>

        <button className="h-11 w-full rounded-xl bg-brand text-sm font-semibold text-white">
          Create character
        </button>
      </section>
    </div>
  )
}
