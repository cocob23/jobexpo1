import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL as string
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente con permisos de administrador para operaciones que requieren privilegios elevados
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
