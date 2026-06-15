"use client"

import * as React from "react"

const STORAGE_KEY = "app-language"

const OPTIONS = [
  { value: "ko", label: "한국어", description: "앱 기본 언어를 한국어로 표시" },
  { value: "en", label: "English", description: "Use English as app language" },
] as const

type LanguageValue = (typeof OPTIONS)[number]["value"]

export function LanguageSelector() {
  const [language, setLanguage] = React.useState<LanguageValue>("ko")

  React.useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)

    if (saved === "ko" || saved === "en") {
      setLanguage(saved)
    }
  }, [])

  const onSelectLanguage = (nextLanguage: LanguageValue) => {
    setLanguage(nextLanguage)
    window.localStorage.setItem(STORAGE_KEY, nextLanguage)
  }

  return (
    <div className="mt-4 border-y border-grey-200 dark:border-grey-800">
      {OPTIONS.map((option, index) => {
        const selected = language === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelectLanguage(option.value)}
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

export type { LanguageValue }
