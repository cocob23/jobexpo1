// supabase.ts
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,         // 👈 dónde persiste
    autoRefreshToken: true,        // 👈 refresca tokens en background
    persistSession: true,          // 👈 guarda sesión entre reinicios
    detectSessionInUrl: false,     // 👈 RN no usa callbacks por URL
  },
})
