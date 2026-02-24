import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Server-side client using service role key — bypasses RLS
// Safe to use server-side only (never expose to browser)
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
