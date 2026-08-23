import { createClient } from '@supabase/supabase-js'

// Load environment variables dynamically.
// Vite loads env variables starting with VITE_ via import.meta.env
// If Vite environment is not available or values are missing,
// we fall back to standard process.env or placeholder defaults if necessary.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    'Supabase configuration missing in environmental variables. ' +
    'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in D:\\medicalai\\.env.local'
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
