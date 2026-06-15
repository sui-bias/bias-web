"use client"

import { useTheme } from "next-themes"

const OPTIONS = [
  {
    value: "light",
    label: "라이트 모드",
    description: "항상 밝은 화면으로 표시",
  },
  {
    value: "dark",
    label: "다크 모드",
    description: "항상 어두운 화면으로 표시",
  },
] as const

type ThemeValue = (typeof OPTIONS)[number]["value"]

export function DisplayThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="mt-4 border-y border-grey-200 dark:border-grey-800">
      {OPTIONS.map((option, index) => {
        const selected = theme === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={`w-full px-4 py-3 text-left transition-colors ${
              index > 0 ? "border-t border-grey-200 dark:border-grey-800" : ""
            }${
              selected
                ? "bg-brand/5"
                : "hover:bg-grey-50 dark:hover:bg-grey-900"
            }`}
            aria-pressed={selected}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-grey-900 dark:text-white">
                {option.label}
              </p>
              {selected ? (
                <span className="text-xs font-semibold text-brand">선택됨</span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-grey-500 dark:text-grey-400">
              {option.description}
            </p>
          </button>
        )
      })}
    </div>
  )
}

export type { ThemeValue }
