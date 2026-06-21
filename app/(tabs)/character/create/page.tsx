import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { CharacterForm } from "@/components/character/character-form"

export default function CharacterCreatePage() {
  return (
    <div className="space-y-4 pt-6">
      <AppHeader
        left={
          <Link
            href="/character"
            aria-label="Back to characters"
            className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
          >
            <ArrowLeft size={20} />
          </Link>
        }
        title="Create Character"
      />

      {/* TODO(plan-gate): free / plus 2개 한도 초과 시 blockedReason 전달 */}
      <CharacterForm mode="create" />
    </div>
  )
}
