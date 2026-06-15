import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { AppHeader } from "@/components/app-header"

export default function SettingsPage() {
  return (
    <div className="space-y-4 pt-6">
      <AppHeader
        left={
          <Link
            href="/list"
            aria-label="Back to list"
            className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
          >
            <ChevronLeft size={20} />
          </Link>
        }
        title="전체설정"
        centerClassName="flex-1"
      />

      <section className="border-y border-grey-200 dark:border-grey-800">
        <Link
          href="/settings/display"
          className="flex items-center justify-between px-1 px-4 py-3 transition-colors hover:bg-grey-50 dark:hover:bg-grey-900"
        >
          <div>
            <p className="font-medium text-grey-900 dark:text-white">화면</p>
            <p className="text-xs text-grey-500 dark:text-grey-400">
              라이트/다크 모드를 설정합니다.
            </p>
          </div>
          <ChevronRight size={18} className="text-grey-400" />
        </Link>
        <Link
          href="/settings/language"
          className="flex items-center justify-between border-t border-grey-200 px-1 px-4 py-3 transition-colors hover:bg-grey-50 dark:border-grey-800 dark:hover:bg-grey-900"
        >
          <div>
            <p className="font-medium text-grey-900 dark:text-white">언어</p>
            <p className="text-xs text-grey-500 dark:text-grey-400">
              앱에서 사용할 언어를 설정합니다.
            </p>
          </div>
          <ChevronRight size={18} className="text-grey-400" />
        </Link>
      </section>
    </div>
  )
}
