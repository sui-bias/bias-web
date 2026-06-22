# Bias — AI characters that remember you, on Sui

> **A relationship-first AI chat app where characters keep long-term memory — stored on Walrus, encrypted with Seal, and recalled with MemWal.**

Built for **Sui Overflow 2026**. Bias is not a story-branching chatbot or a one-way "bubble" celebrity app. It's a messenger-style chat where you talk — **1:1 *and* in group rooms with multiple characters** — to AI characters that *remember* your taste, your promises, and your relationship, and prove it with verifiable on-chain memory you actually own.

---

## ✨ The problem

Today's AI character apps reset every conversation. The character forgets who you are, what you agreed on, and how close you've become. The "relationship" is fake — there's no continuity, and no way to verify that your memories are actually yours and actually private.

## 💡 What Bias does

- **Characters that remember.** Your preferences, inside jokes, and relationship context persist across sessions. The next conversation continues where the last one left off.
- **Memory you actually own.** Each user has their **own MemWal account** (created at onboarding), and the server only reads/writes via **delegate keys** you grant. Long-term memory is written to **Walrus** (decentralized storage), **encrypted with Seal**, and retrieved through **MemWal** — so "the AI remembers" is a provable storage → encrypt → search → recall flow, not a black box.
- **1:1 and group rooms.** Talk to one character, or share a room where multiple characters keep their own memory per `(room × character × user)` namespace. Group chat works today; richer cross-character memory recall is on the roadmap.
- **Your wallet is your account.** Connect a Sui wallet, sign a message, and you're in. One wallet = one account, enforced at the database level.
- **A real subscription, on-chain.** Plans (Plus / Pro / Max) are **NFT membership passes** on Sui Move — ownable, renewable, upgradeable, and tradeable in a built-in escrow marketplace.
- **Relationship levels (Lv1–Lv4).** Characters grow closer over time, and tone shifts with intimacy.

---

## 🎬 Demo

| | |
| --- | --- |
| 🌐 Live demo | https://bias-web.vercel.app/onboarding|
| 📹 Demo video | https://youtu.be/m1FCL5CfA90

---

## 🧠 How memory works

Every message turn is orchestrated in [`app/api/chat/message/route.ts`](app/api/chat/message/route.ts) against the user's own MemWal account:

```
 You send a message
        │
        ▼
 1. namespace = room:{roomId}:char:{characterId}:user:{userAddress}
        │           (first message seeds the namespace with the character persona)
        ▼
 2. recall ── MemWal.recallManual(query=yourMessage, limit=5, namespace)
        │      → top-5 semantically relevant past memories
        ▼
 3. prompt = character persona + [Recalled Memories] + recent room history
        │      (history tags speakers: you / self-character / other characters)
        ▼
 4. LLM reply  +  importance score (HIGH / MED / LOW)
        │
        ▼
 5. remember ── if importance ≠ LOW: MemWal.rememberManual(turn, namespace)
                → Walrus (store) + Seal (encrypt) + embedding (index)
```

**Memory is namespaced per `(room × character × user)`.** That means private 1:1 memories never leak into group rooms, and the same character keeps separate relationships with different users. Importance is scored by the LLM with a Korean/English keyword guardrail, so transient noise (importance `LOW`) is dropped — natural forgetting — and sensitive content is never stored.

> **Group chat & cross-character memory:** in a group room, characters already *see* each other's lines through the recent-history window. Recalling another character's long-term MemWal memory across namespaces is the next enhancement (see Roadmap below). Full details in [`docs/MEMWAL.md`](https://github.com/sui-bias/docs/blob/main/MEMWAL.md).

---

## 🏗️ Architecture

Bias is split across three repositories under the [`sui-bias`](https://github.com/sui-bias) org:

| Repo | Role | Stack |
| --- | --- | --- |
| **[bias-web](https://github.com/sui-bias/bias-web)** _(this repo)_ | Web app — onboarding, wallet auth, chat UI, characters, pricing & NFT marketplace | Next.js 16 (App Router), React 19, Tailwind v4, shadcn/ui |
| **[bias-chat](https://github.com/sui-bias/bias-chat)** | AI chat engine — character cards, relationship system, structured responses, memory builders | Python, OpenAI |
| **[docs](https://github.com/sui-bias/docs)** | Product spec, wireframes, design tokens, business model | Markdown |

The Sui Move subscription contract lives in [`move/bias_subscription`](move/bias_subscription) inside this repo.

```
┌────────────────────────────────────────────────────┐
│  bias-web (Next.js)                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Wallet   │  │  Chat    │  │ Pricing / Market │   │
│  │ auth     │  │  UI      │  │ (NFT passes)     │   │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
└───────┼─────────────┼─────────────────┼─────────────┘
        │             │                 │
        ▼             ▼                 ▼
   Sui wallet   Walrus + Seal      Sui Move contract
   signature    + MemWal           (MembershipPass)
   verify       (memory)
        │             │                 │
        └─────────────┴─── Supabase ────┘
              (profiles, rooms, cache)
```

---

## 🛠️ Tech stack

**Frontend / app**
- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 · shadcn/ui · Radix UI
- TanStack Query

**Sui & sponsor tech**
- [`@mysten/sui`](https://www.npmjs.com/package/@mysten/sui) · [`@mysten/dapp-kit`](https://www.npmjs.com/package/@mysten/dapp-kit) — wallet connect + signature verification
- [`@mysten/walrus`](https://www.npmjs.com/package/@mysten/walrus) — decentralized memory storage
- [`@mysten/seal`](https://www.npmjs.com/package/@mysten/seal) — memory encryption
- [`@mysten-incubation/memwal`](https://www.npmjs.com/package/@mysten-incubation/memwal) — agentic memory recall
- **Sui Move** — NFT membership-pass subscription + escrow marketplace

**Backend / data**
- Supabase (Postgres) — profiles, characters, rooms, subscription cache
- Python + OpenAI — character chat engine (`bias-chat`)

---

## 🔗 Smart contracts

NFT **membership pass** subscription written in Sui Move (`move/bias_subscription/sources/subscription.move`).

- A `MembershipPass` is a flat, mutable object `{ tier, issued_ms, expires_ms }` (`key + store`).
- Plan validation reads **on-chain pass ownership** as the source of truth; Supabase only caches it.
- `renew` updates `expires_ms` in place (passes don't pile up); `upgrade` burns the old pass and mints a new one, carrying expiry over.
- Built-in escrow marketplace: `list_pass` / `buy_pass` / `delist` let users trade passes.

**Deployed (Sui testnet, 2026-06-20):**

| Object | ID |
| --- | --- |
| Package | `0x839f62375ab7482a4b4cdd8ef45e8a4871e8f5fc260fb0cf66c9de433e41e153` |
| Config (shared) | `0xbd58c9c59ed74201121b079a7b53710790b876d7f23b59f7073b7e412811a0ae` |

Demo pricing: **Plus 0.1 / Pro 0.25 / Max 0.5 SUI**, 1-day period. See [`move/bias_subscription/DEPLOY.md`](move/bias_subscription/DEPLOY.md).

---

## 🚀 Getting started

### Prerequisites

- Node.js 20+
- A Sui wallet (e.g. [Slush](https://slush.app)) with testnet SUI
- Supabase project + OpenAI API key (for the chat engine)

### Run the web app

```bash
git clone https://github.com/sui-bias/bias-web
cd bias-web
npm install
cp .env.local.example .env.local   # then fill in the values below
npm run dev                         # http://localhost:3000
```

### Environment variables (`.env.local`)

```bash
# Sui
NEXT_PUBLIC_SUI_NETWORK=testnet            # testnet | mainnet

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Memory (MemWal / Walrus / Seal)
MEMWAL_RELAYER_URL=...            # MemWal relayer (defaults to staging)
MEMWAL_PACKAGE_ID=...            # on-chain MemWal package
MEMWAL_REGISTRY_ID=...           # MemWal registry object
MEMWAL_PRIVATE_KEY=...           # client key
SERVER_SUI_PRIVATE_KEY=...       # server signer for delegated reads/writes
SERVER_DELEGATE_PUBKEY=...       # delegate key registered on the user's account (memwal)
SERVER_SEAL_DELEGATE_PUBKEY=...  # delegate key for Seal decryption

# Chat engine + embeddings
OPENAI_API_KEY=...               # LLM replies + MemWal semantic-search embeddings
```

> See [`AUTH_SETUP.md`](AUTH_SETUP.md) and [`SUBSCRIPTION_SETUP.md`](SUBSCRIPTION_SETUP.md) for the full setup, and `supabase/schema.sql` for the database schema.

### Run the chat engine

```bash
git clone https://github.com/sui-bias/bias-chat
cd bias-chat
pip install -r requirements.txt
python main.py
```

---

## 📂 Project structure (bias-web)

```
app/
  (tabs)/          chat, explore, character, list, mypage
  (rooms)/         group rooms
  onboarding/      connect → profile → character gate
  pricing/         plan comparison
  market/          NFT pass marketplace
  api/             auth, chat, characters, memwal
lib/               auth, subscription, pass, characters, rooms, supabase…
components/        UI + auth-guard
hooks/             use-current-plan, use-pass-actions…
move/              Sui Move subscription contract
supabase/          schema + migrations
```

---

## 🗺️ Roadmap

- [x] Wallet login (one wallet = one account)
- [x] User-owned MemWal account + server delegate keys (onboarding flow)
- [x] 1:1 chat with long-term memory (Walrus + Seal + MemWal)
- [x] Group rooms with per-`(room × character × user)` memory isolation
- [x] NFT membership-pass subscription + marketplace (testnet)
- [ ] Cross-character / cross-room long-term memory recall (multi-namespace)
- [ ] Character autonomous speech in group chats
- [ ] Server-enforced ownership for profile writes
- [ ] Mainnet deployment

---

## 👥 Team

**sui-bias** — built at Sui Overflow 2026.

_TODO: add team members & roles._

---

<sub>Sui Overflow 2026 hackathon project · [github.com/sui-bias](https://github.com/sui-bias)</sub>
