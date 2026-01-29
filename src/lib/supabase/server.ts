import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * Supabase admin client for server-side operations with elevated permissions
 * Use this ONLY in server components, API routes, or server actions
 * Will be null if environment variables are not configured
 */
let supabaseAdminInstance: SupabaseClient | null = null

if (supabaseUrl && supabaseServiceKey) {
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
} else {
    console.warn('Supabase service role key not configured. Admin features will be unavailable.')
}

export const supabaseAdmin = supabaseAdminInstance as SupabaseClient

/**
 * Check if Supabase admin is properly configured
 */
export function isSupabaseAdminConfigured(): boolean {
    return supabaseAdminInstance !== null
}
