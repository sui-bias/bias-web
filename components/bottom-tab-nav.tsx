"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  MessageCircle,
  MessagesSquare,
  PlusCircle,
  User,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/list", label: "List", icon: Users },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/character", label: "Create", icon: PlusCircle },
  { href: "/open-chat", label: "Open", icon: MessagesSquare },
  { href: "/mypage", label: "My", icon: User },
] as const

export function BottomTabNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed right-0 bottom-0 left-0 z-30 border-t border-grey-200 bg-white/95 backdrop-blur dark:border-grey-800 dark:bg-grey-900/95"
      aria-label="Bottom tabs"
    >
      <ul className="mx-auto grid h-16 w-full max-w-md grid-cols-5 px-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`)

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 transition-colors",
                  active
                    ? "text-brand"
                    : "text-grey-500 hover:text-grey-700 dark:text-grey-400 dark:hover:text-grey-200"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 2} />
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
