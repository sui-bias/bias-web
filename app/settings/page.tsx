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
        title="Settings"
        centerClassName="flex-1"
      />

      <section className="border-y border-grey-200 dark:border-grey-800">
        <Link
          href="/settings/display"
          className="flex items-center justify-between px-1 px-4 py-3 transition-colors hover:bg-grey-50 dark:hover:bg-grey-900"
        >
          <div>
            <p className="font-medium text-grey-900 dark:text-white">Display</p>
            <p className="text-xs text-grey-500 dark:text-grey-400">
              Set light or dark mode.
            </p>
          </div>
          <ChevronRight size={18} className="text-grey-400" />
        </Link>
        <Link
          href="/settings/language"
          className="flex items-center justify-between border-t border-grey-200 px-1 px-4 py-3 transition-colors hover:bg-grey-50 dark:border-grey-800 dark:hover:bg-grey-900"
        >
          <div>
            <p className="font-medium text-grey-900 dark:text-white">Language</p>
            <p className="text-xs text-grey-500 dark:text-grey-400">
              Set the app language.
            </p>
          </div>
          <ChevronRight size={18} className="text-grey-400" />
        </Link>
      </section>
    </div>
  )
}
