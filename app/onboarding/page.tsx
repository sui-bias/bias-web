"use client"

import ConnectWallet from "@/components/connect-wallet"
import Link from "next/link"

const previewMessages = [
  {
    id: 1,
    sender: "Tony Stark",
    text: "Interns, morning briefing in Lab 7. Arc reactor diagnostics starts now.",
    role: "character",
  },
  {
    id: 2,
    sender: "Peter Parker",
    text: "On it, Mr. Stark! I already finished the web-fluid stress test report.",
    role: "character",
  },
  {
    id: 3,
    sender: "You",
    text: "I pushed the internship dashboard update. Need a quick review?",
    role: "user",
  },
  {
    id: 4,
    sender: "Tony Stark",
    text: "Good. Keep this pace and Stark Internship badges are yours.",
    role: "character",
  },
] as const

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

      {/* Group chat preview */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-4 top-8 z-0 sm:inset-x-8"
      >
        <div className="mx-auto space-y-8">
          <div className="text-center">
            Stark Internship <span className="ml-1 text-gray-400">4</span>
          </div>
          <div className="space-y-3.5">
            {previewMessages.map((message, index) => {
              const isUser = message.role === "user"
              return (
                <div
                  key={message.id}
                  className={`bubble-row flex items-end gap-2 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                  style={{ animationDelay: `${index * 0.75}s` }}
                >
                  {!isUser && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-grey-100">
                      {message.sender.slice(0, 1)}
                    </span>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                      isUser
                        ? "rounded-br-md bg-brand/95 text-white"
                        : "rounded-bl-md bg-white/10 text-grey-100"
                    }`}
                  >
                    <p className="text-[10px] font-medium tracking-[0.08em] text-white/70 uppercase">
                      {message.sender}
                    </p>
                    <p className="mt-0.5 text-sm leading-snug">
                      {message.text}
                    </p>
                  </div>
                </div>
              )
            })}
            <div
              className="bubble-row flex items-end justify-end gap-2"
              style={{ animationDelay: `${4 * 0.75}s` }}
            >
              <div className="max-w-[80%] rounded-2xl rounded-br-md bg-brand/95 px-3 py-2 text-white">
                <p className="text-[10px] font-medium tracking-[0.08em] text-white/70 uppercase">
                  YOU
                </p>
                <span className="mt-0.5 flex h-5 items-center gap-1">
                  <span className="dot">•</span>
                  <span className="dot dot-2">•</span>
                  <span className="dot dot-3">•</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="relative z-10 flex flex-1 flex-col justify-end gap-4 bg-gradient-to-b from-transparent to-grey-900 px-6 pb-8">
        {" "}
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt="mybias"
          className="h-9 w-auto self-center brightness-0 invert"
        />
        {/* Hero text */}
        <div className="space-y-3 text-center">
          {/* <h1 className="text-2xl leading-tight font-bold tracking-tight">
            Chat with your
            <br />
            own characters
          </h1> */}
          <p className="text-sm leading-relaxed text-grey-400">
            <span className="font-semibold">Group chats</span> with your own
            characters,
            <br />
            with lasting memory via{" "}
            <span className="font-semibold">MemWal</span>.
          </p>
        </div>
        {/* CTA */}
        <div className="flex flex-col gap-2">
          <ConnectWallet />
          {/* <Link
          
            href="/onboarding/connect"
            className="flex h-12 items-center justify-center rounded-md bg-brand text-base font-semibold text-white transition-opacity active:opacity-80"
          >
            Continue with Slush
          </Link> */}
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

      <style jsx>{`
        .bubble-row {
          opacity: 0;
          transform: translateY(12px) scale(0.96);
          animation: bubble-in 0.55s cubic-bezier(0.2, 0.85, 0.2, 1) forwards;
        }

        @keyframes bubble-in {
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .dot {
          animation: typing 1s steps(1, end) infinite;
        }
        .dot-2 {
          animation-delay: 0.12s;
        }
        .dot-3 {
          animation-delay: 0.24s;
        }
        @keyframes typing {
          0%,
          100% {
            opacity: 0.25;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-1px);
          }
        }
      `}</style>
    </div>
  )
}
