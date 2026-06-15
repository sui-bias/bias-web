import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { LanguageSelector } from "@/components/language-selector"

export default function LanguageSettingsPage() {
  return (
    <div className="pt-6">
      <AppHeader
        className="px-4"
        left={
          <Link
            href="/settings"
            aria-label="Back to settings"
            className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
          >
            <ChevronLeft size={20} />
          </Link>
        }
        title="언어"
      />

      <LanguageSelector />
    </div>
  )
}
