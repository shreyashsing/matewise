/**
 * Example service for user-related business logic
 * This demonstrates the service layer in the modular monolithic architecture
 */

import { supabase } from '@/lib/supabase'
import type { User } from '@/types'

export class UserService {
    /**
     * Get user by ID
     */
    static async getUserById(userId: string): Promise<User | null> {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) throw error
            return data as User
        } catch (error) {
            console.error('Error fetching user:', error)
            return null
        }
    }

    /**
     * Create a new user
     */
    static async createUser(userData: Partial<User>): Promise<User | null> {
        try {
            const { data, error } = await supabase
                .from('users')
                .insert([userData])
                .select()
                .single()

            if (error) throw error
            return data as User
        } catch (error) {
            console.error('Error creating user:', error)
            return null
        }
    }

    // Add more user-related methods here
}
