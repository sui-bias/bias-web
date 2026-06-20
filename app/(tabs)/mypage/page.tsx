"use client"

import Link from "next/link"
import {
  Bell,
  ChevronRight,
  Globe,
  type LucideIcon,
  LogOut,
  MessageSquareText,
  Palette,
  ShieldX,
  Sparkles,
  Trash2,
  UserCog,
  Users,
} from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { useCurrentUser } from "@/hooks/use-current-user"
import { PLANS } from "@/lib/plans"

function shortAddr(addr?: string | null) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "지갑 미연결"
}

export default function MyPage() {
  const { address, user, plan, loading } = useCurrentUser()
  const isPlus = plan !== "free"
  const characterLimit = PLANS[plan].characterLimit
  const displayName = user?.display_name ?? (loading ? "불러오는 중…" : "게스트")
  const handle = user?.username ?? "guest"
  // TODO(api): 캐릭터 개수·메시지 사용량은 아직 DB 미집계 → placeholder
  const characterUsage = characterLimit > 0 ? `0 / ${characterLimit}` : "Plus 전용"

  return (
    <div className="space-y-6 pt-6 pb-6">
      <AppHeader title="My Page" titleClassName="text-2xl" />

      {/* 프로필 헤더 카드 */}
      <section className="px-4">
        <div className="flex items-center gap-3">
          <div className="size-16 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-violet-300 to-indigo-500">
            {user?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image_url}
                alt=""
                className="size-full object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-lg font-bold text-grey-900 dark:text-white">
                {displayName}
              </p>
              <span
                className={
                  isPlus
                    ? "rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white"
                    : "rounded-full bg-grey-200 px-2 py-0.5 text-[11px] font-semibold text-grey-600 dark:bg-grey-700 dark:text-grey-200"
                }
              >
                {plan.toUpperCase()}
              </span>
            </div>
            <p className="truncate text-sm text-grey-500 dark:text-grey-400">
              @{handle} · {shortAddr(address)}
            </p>
          </div>
          <Link
            href="/mypage/profile"
            className="shrink-0 rounded-xl border border-grey-200 px-3 py-1.5 text-xs font-semibold text-grey-700 transition-colors hover:bg-grey-100 dark:border-grey-700 dark:text-grey-200 dark:hover:bg-grey-800"
          >
            편집
          </Link>
        </div>
      </section>

      {/* 플랜 · 사용량 카드 */}
      <section className="px-4">
        <div className="space-y-3 rounded-2xl border border-grey-200 p-4 dark:border-grey-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-brand" />
              <span className="text-sm font-bold text-grey-900 dark:text-white">
                {PLANS[plan].name} 플랜
              </span>
            </div>
            <Link
              href="/pricing"
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white"
            >
              {isPlus ? "플랜 관리" : "업그레이드"}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Usage label="메시지" value="—" />
            <Usage label="내 캐릭터" value={characterUsage} />
          </div>
        </div>
      </section>

      {/* 관리 */}
      <MenuGroup title="관리">
        <MenuRow
          icon={UserCog}
          label="내 캐릭터 관리"
          href="/character"
          trailing={characterLimit > 0 ? `0/${characterLimit}` : undefined}
        />
        <MenuRow icon={Users} label="내 그룹 방 관리" href="/mypage/groups" />
        <MenuRow
          icon={MessageSquareText}
          label="대화 기억 관리"
          href="/mypage/memory"
        />
        <MenuRow icon={ShieldX} label="친구 · 차단 관리" href="/list" />
      </MenuGroup>

      {/* 설정 */}
      <MenuGroup title="설정">
        <MenuRow icon={Palette} label="화면" href="/settings/display" />
        <MenuRow icon={Globe} label="언어" href="/settings/language" />
        <MenuRow icon={Bell} label="알림" href="/mypage/notifications" />
      </MenuGroup>

      {/* 계정 */}
      <MenuGroup title="계정">
        <MenuRow
          icon={Trash2}
          label="데이터 삭제 요청"
          href="/mypage/data-deletion"
        />
        <MenuRow icon={LogOut} label="지갑 연결 해제" href="/onboarding" />
      </MenuGroup>
    </div>
  )
}

function Usage({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-grey-100 px-3 py-2 dark:bg-grey-800">
      <p className="text-grey-500 dark:text-grey-400">{label}</p>
      <p className="mt-0.5 font-semibold text-grey-900 dark:text-white">
        {value}
      </p>
    </div>
  )
}

function MenuGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="px-4">
      <h2 className="mb-1 px-1 text-xs font-semibold text-grey-400 dark:text-grey-500">
        {title}
      </h2>
      <ul className="divide-y divide-grey-100 dark:divide-grey-800">
        {children}
      </ul>
    </section>
  )
}

function MenuRow({
  icon: Icon,
  label,
  href,
  trailing,
}: {
  icon: LucideIcon
  label: string
  href: string
  trailing?: string
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 py-3 transition-colors hover:bg-grey-50 dark:hover:bg-grey-800/80"
      >
        <Icon size={20} className="shrink-0 text-grey-500 dark:text-grey-400" />
        <span className="flex-1 text-sm text-grey-900 dark:text-white">
          {label}
        </span>
        {trailing ? (
          <span className="text-xs text-grey-400 dark:text-grey-500">
            {trailing}
          </span>
        ) : null}
        <ChevronRight
          size={18}
          className="shrink-0 text-grey-300 dark:text-grey-600"
        />
      </Link>
    </li>
  )
}
