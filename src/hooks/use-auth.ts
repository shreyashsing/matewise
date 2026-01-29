/**
 * Authentication hook for managing user auth state
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthState {
    user: User | null
    loading: boolean
    role: 'provider' | 'consumer' | null
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        loading: true,
        role: null
    })

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            const user = session?.user ?? null
            let role: 'provider' | 'consumer' | null = null

            if (user) {
                // Get user role from metadata
                role = (user.user_metadata?.role as 'provider' | 'consumer') || null
            }

            setState({ user, loading: false, role })
        })

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const user = session?.user ?? null
            let role: 'provider' | 'consumer' | null = null

            if (user) {
                role = (user.user_metadata?.role as 'provider' | 'consumer') || null
            }

            setState({ user, loading: false, role })
        })

        return () => subscription.unsubscribe()
    }, [])

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        return { data, error }
    }

    const signOut = async () => {
        const { error } = await supabase.auth.signOut()
        return { error }
    }

    return {
        user: state.user,
        loading: state.loading,
        role: state.role,
        signIn,
        signOut
    }
}
