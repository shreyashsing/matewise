import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Supabase client for client-side operations
 * Will be null if environment variables are not configured
 */
let supabaseInstance: SupabaseClient | null = null

if (supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
} else {
    console.warn('Supabase environment variables not configured. Some features will be unavailable.')
}

export const supabase = supabaseInstance as SupabaseClient

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
    return supabaseInstance !== null
}
