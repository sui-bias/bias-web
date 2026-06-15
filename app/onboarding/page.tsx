import Link from "next/link"
import { AppHeader } from "@/components/app-header"

export default function OnboardingLandingPage() {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-grey-900 text-white">
      {/* Background gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(197,42,58,0.28) 0%, transparent 70%)",
        }}
      />

      {/* Top header */}
      <AppHeader
        className="relative z-10 px-6 pt-10 pb-2"
        left={<span className="text-2xl font-bold tracking-tight text-white">MyBias</span>}
      />

      {/* Main content */}
      <main className="relative z-10 flex flex-1 flex-col justify-end gap-10 px-6 pb-16">
        {/* Hero text */}
        <div className="space-y-3">
          <h1 className="text-[2.125rem] leading-tight font-bold tracking-tight">
            Chat with your
            <br />
            own characters
          </h1>
          <p className="text-base leading-relaxed text-grey-400">
            1:1 conversations and group chats
            <br />
            with AI characters made just for you
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3">
          <Link
            href="/onboarding/connect"
            className="flex h-14 items-center justify-center rounded-xl bg-brand text-base font-semibold text-white transition-opacity active:opacity-80"
          >
            Connect
          </Link>
          <p className="text-center text-xs text-grey-500">
            By continuing you agree to our{" "}
            <span className="underline underline-offset-2">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="underline underline-offset-2">Privacy Policy</span>
          </p>
        </div>
      </main>
    </div>
  )
}
