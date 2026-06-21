import { supabase } from "./supabase"

export async function ensureNamespaceState(
  namespaceKey: string,
  lastSessionId: number | null
) {
  const { error } = await supabase.rpc("ensure_memwal_namespace_state", {
    p_namespace_key: namespaceKey,
    p_last_session_id: lastSessionId,
  })
  if (error) throw new Error(error.message)
}

export async function claimSeedWrite(
  namespaceKey: string,
  lastSessionId: number | null
): Promise<boolean> {
  const { data, error } = await supabase.rpc("claim_memwal_seed_write", {
    p_namespace_key: namespaceKey,
    p_last_session_id: lastSessionId,
  })
  if (error) throw new Error(error.message)
  return data === true
}

export async function finalizeSeedWriteSuccess(
  namespaceKey: string,
  seedFingerprint: string,
  lastSessionId: number | null
) {
  const { error } = await supabase.rpc("finalize_memwal_seed_write_success", {
    p_namespace_key: namespaceKey,
    p_seed_fingerprint: seedFingerprint,
    p_last_session_id: lastSessionId,
  })
  if (error) throw new Error(error.message)
}

export async function finalizeSeedWriteFailure(
  namespaceKey: string,
  seedError: string,
  lastSessionId: number | null
) {
  const { error } = await supabase.rpc("finalize_memwal_seed_write_failure", {
    p_namespace_key: namespaceKey,
    p_seed_error: seedError,
    p_last_session_id: lastSessionId,
  })
  if (error) throw new Error(error.message)
}
