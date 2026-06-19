# Auth (회원가입) 셋업 가이드

지갑 연동(Slush, Sui mainnet) + 프로필 저장(Supabase)까지 구현된 회원가입 흐름의 실행 방법.

## 1. 의존성 설치

`package.json`에 아래가 추가되어 있다. 로컬에서 설치한다.

```bash
cd bias-web
npm install
```

추가된 패키지: `@mysten/dapp-kit`, `@mysten/sui`, `@tanstack/react-query`, `@supabase/supabase-js`
(설치 후 peer 버전 경고가 나면 `npm install @mysten/dapp-kit@latest @mysten/sui@latest` 로 맞춘다.)

## 2. Supabase 준비 (팀 공용 DB)

1. 한 명이 supabase.com에서 프로젝트 생성 → 팀원을 Organization에 초대.
2. `supabase/schema.sql` 내용을 Supabase 대시보드 > SQL Editor에 붙여넣고 실행 (users 테이블 생성).
3. Project Settings > API에서 URL과 anon key 복사.

## 3. 환경변수

`.env.local.example` 을 `.env.local` 로 복사하고 값 채우기. (URL/anon key는 팀원 전원 동일하게)

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUI_NETWORK=mainnet
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## 4. 실행

```bash
npm run dev
```

## 흐름

```
/onboarding (랜딩)
  → /onboarding/connect   : Slush 연결 (확장 없으면 웹 지갑 소셜 로그인)
      → 연결되면 주소로 Supabase 조회
          · 기존 유저(onboarding_complete) → /chat
          · 신규 유저               → /onboarding/profile
  → /onboarding/profile   : 3-step 프로필 입력 → Done 시 users upsert (회원가입 완료)
      → /onboarding/character
```

## 건드린/추가한 파일

- `components/sui-provider.tsx` (신규) — dapp-kit + react-query Provider, mainnet 기본, Slush 등록
- `lib/supabase.ts` (신규) — Supabase 클라이언트
- `lib/users.ts` (신규) — `getUser`, `saveProfile`
- `app/layout.tsx` — `SuiProvider`로 앱 래핑
- `app/onboarding/connect/page.tsx` — mock 제거, Slush 실연동 + 기존/신규 분기
- `app/onboarding/profile/page.tsx` — Done 시 Supabase 저장
- `supabase/schema.sql` (신규) — users 테이블 DDL
- `.env.local.example` (신규)

## 참고 / 주의

- RLS 정책이 **데모용으로 전부 허용**(anon read/write)이다. 프로덕션 전 지갑 서명 검증 기반으로 강화 필요.
- 이 환경에서는 npm 레지스트리 접근이 막혀 빌드 검증을 못 했다. 로컬에서 `npm run typecheck` / `npm run build`로 최종 확인 권장.
- Next 16 특이사항은 `AGENTS.md` 참고.
