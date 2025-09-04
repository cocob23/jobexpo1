// constants/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const SERVICE_ROLE = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY as string

if (!SUPABASE_URL) {
  console.warn('[supabaseAdmin] Falta EXPO_PUBLIC_SUPABASE_URL')
}
if (!SERVICE_ROLE) {
  console.warn('[supabaseAdmin] Falta EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY')
}

// ⚠️ OJO: usar service role en cliente NO es seguro. Solo para tests rápidos.
// Mantené auth sin persistencia y sin auto refresh.
export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { headers: { 'x-client-info': 'mobile-admin' } },
})
