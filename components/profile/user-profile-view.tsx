import { MessageCircle, UserX } from "lucide-react"
import type { User } from "@/lib/types"
import { ProfileActionButton, ProfileHero } from "./profile-hero"

// 실제 사람 친구 프로필 = 카카오톡 chat 프로필 그대로.
export function UserProfileView({ user }: { user: User }) {
  return (
    <div>
      <ProfileHero
        name={user.name}
        intro={user.intro}
        imageUrl={user.imageUrl}
        backHref="/list"
        actions={
          <>
            <ProfileActionButton
              icon={MessageCircle}
              label="1:1 채팅"
              href={`/chat/new?userId=${user.id}`}
            />
            <ProfileActionButton icon={UserX} label="차단" disabled />
          </>
        }
      />

      <section className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={
              user.online
                ? "inline-flex items-center gap-1.5 text-grey-700 dark:text-grey-200"
                : "inline-flex items-center gap-1.5 text-grey-400 dark:text-grey-500"
            }
          >
            <span
              className={`size-2 rounded-full ${
                user.online ? "bg-emerald-500" : "bg-grey-300 dark:bg-grey-600"
              }`}
            />
            {user.online ? "온라인" : "오프라인"}
          </span>
        </div>
        {user.walletAddress ? (
          <div className="rounded-xl bg-grey-100 px-3 py-2 text-xs text-grey-600 dark:bg-grey-800 dark:text-grey-300">
            <span className="font-semibold">지갑</span> · {user.walletAddress}
          </div>
        ) : null}
      </section>
    </div>
  )
}
