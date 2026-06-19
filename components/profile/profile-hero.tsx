import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type ProfileHeroProps = {
  name: string
  intro?: string
  imageUrl?: string
  backHref: string
  /** 이름 옆 배지 (예: 캐릭터 "C") */
  badge?: React.ReactNode
  /** 하단 액션 바 — ProfileActionButton 들을 넣는다 */
  actions: React.ReactNode
}

// 카카오톡 구버전 친구 프로필 차용: 풀블리드 이미지 + 하단 이름/상태메시지 + 액션 바.
export function ProfileHero({
  name,
  intro,
  imageUrl,
  backHref,
  badge,
  actions,
}: ProfileHeroProps) {
  return (
    <section>
      <div className="relative aspect-[3/4] overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="size-full bg-gradient-to-br from-violet-300 via-fuchsia-400 to-indigo-500" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 to-transparent" />

        <Link
          href={backHref}
          aria-label="뒤로 가기"
          className="absolute top-5 left-4 inline-flex size-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition-colors hover:bg-black/50"
        >
          <ArrowLeft size={20} />
        </Link>

        <div className="absolute right-4 bottom-4 left-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{name}</h1>
            {badge}
          </div>
          {intro ? (
            <p className="mt-1 text-sm text-white/85">{intro}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-stretch gap-1 border-b border-grey-200 px-2 py-2 dark:border-grey-800">
        {actions}
      </div>
    </section>
  )
}

type ProfileActionButtonProps = {
  icon: LucideIcon
  label: string
  href?: string
  disabled?: boolean
  onClick?: () => void
  /** 강조 스타일(브랜드색) */
  primary?: boolean
}

export function ProfileActionButton({
  icon: Icon,
  label,
  href,
  disabled,
  onClick,
  primary,
}: ProfileActionButtonProps) {
  const className = cn(
    "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium transition-colors",
    disabled
      ? "cursor-not-allowed text-grey-300 dark:text-grey-600"
      : primary
        ? "text-brand hover:bg-brand-lightest dark:hover:bg-brand/10"
        : "text-grey-700 hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
  )

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        <Icon size={20} />
        {label}
      </Link>
    )
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      <Icon size={20} />
      {label}
    </button>
  )
}
