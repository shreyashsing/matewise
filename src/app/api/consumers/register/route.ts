/**
 * Consumer Registration API Route
 * POST /api/consumers/register
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { ApiResponse, ConsumerRegistrationData } from '@/types'
import { isValidPhone } from '@/lib/location-rules'

// Create admin client lazily to avoid build errors
function getSupabaseAdmin(): SupabaseClient | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        return null
    }

    return createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}

function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

export async function POST(request: NextRequest) {
    try {
        const supabaseAdmin = getSupabaseAdmin()

        if (!supabaseAdmin) {
            const response: ApiResponse = {
                success: false,
                error: 'Database not configured. Please set up Supabase environment variables.'
            }
            return NextResponse.json(response, { status: 503 })
        }

        const body = await request.json() as ConsumerRegistrationData

        // Validate required fields
        const errors: string[] = []

        if (!body.first_name?.trim()) {
            errors.push('First name is required')
        }

        if (!body.last_name?.trim()) {
            errors.push('Last name is required')
        }

        if (!body.email || !isValidEmail(body.email)) {
            errors.push('Valid email is required')
        }

        if (body.phone && !isValidPhone(body.phone)) {
            errors.push('Phone number is not valid')
        }

        if (!body.password || body.password.length < 8) {
            errors.push('Password must be at least 8 characters')
        }

        if (errors.length > 0) {
            const response: ApiResponse = {
                success: false,
                error: errors.join(', ')
            }
            return NextResponse.json(response, { status: 400 })
        }

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: body.email,
            password: body.password,
            email_confirm: true, // Auto-confirm for now
            user_metadata: {
                first_name: body.first_name,
                last_name: body.last_name,
                role: 'consumer'
            }
        })

        if (authError) {
            console.error('Auth error:', authError)
            const response: ApiResponse = {
                success: false,
                error: authError.message
            }
            return NextResponse.json(response, { status: 400 })
        }

        const userId = authData.user.id

        // Create consumer profile
        const { data: consumer, error: consumerError } = await supabaseAdmin
            .from('consumers')
            .insert({
                user_id: userId,
                first_name: body.first_name.trim(),
                last_name: body.last_name.trim(),
                email: body.email.toLowerCase(),
                phone: body.phone?.replace(/\s/g, '') || null
            })
            .select()
            .single()

        if (consumerError) {
            // Rollback: delete the auth user if consumer creation fails
            await supabaseAdmin.auth.admin.deleteUser(userId)

            console.error('Consumer error:', consumerError)
            const response: ApiResponse = {
                success: false,
                error: consumerError.message
            }
            return NextResponse.json(response, { status: 400 })
        }

        // Create profile record
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: userId,
                email: body.email.toLowerCase(),
                name: `${body.first_name} ${body.last_name}`,
                role: 'consumer',
                phone: body.phone?.replace(/\s/g, '') || null
            })

        if (profileError) {
            console.error('Profile creation error:', profileError)
        }

        const response: ApiResponse = {
            success: true,
            data: {
                consumer_id: consumer.id,
                user_id: userId,
                email: body.email
            },
            message: 'Account created successfully'
        }

        return NextResponse.json(response, { status: 201 })

    } catch (error) {
        console.error('Registration error:', error)
        const response: ApiResponse = {
            success: false,
            error: 'An unexpected error occurred'
        }
        return NextResponse.json(response, { status: 500 })
    }
}
