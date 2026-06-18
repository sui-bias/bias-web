import { createClient } from "@supabase/supabase-js"

// 팀 공용 Supabase 프로젝트. URL/anon key는 .env.local 에 넣고 팀원과 공유한다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// env가 비어 있으면 createClient(...)가 import 시점에 throw 하면서
// 페이지 전체가 500이 난다. 누락 시에는 경고만 남기고, 호출은
// 네트워크 단계에서 실패(=getUser는 null 반환 등)하도록 placeholder로 생성한다.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 설정되지 않았습니다. " +
      ".env.local 을 채우기 전까지 프로필 조회/저장은 동작하지 않습니다."
  )
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
)
