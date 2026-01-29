/**
 * Provider Registration API Route
 * POST /api/providers/register
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { ApiResponse, ProviderRegistrationData, ServiceCategory } from '@/types'

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

// Validation helpers
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

function isValidPhone(phone: string): boolean {
    // Indian phone number validation (simplified)
    const phoneRegex = /^(\+91|0)?[6-9][0-9]{9}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
}

function isValidPostcode(postcode: string): boolean {
    // Indian PIN code validation (6 digits)
    const postcodeRegex = /^[1-9][0-9]{5}$/
    return postcodeRegex.test(postcode.replace(/\s/g, ''))
}

const VALID_SERVICES: ServiceCategory[] = [
    'cleaning', 'repairs', 'moving', 'gardening', 'plumbing',
    'painting', 'tutoring', 'care', 'electrical', 'pets'
]

export async function POST(request: NextRequest) {
    try {
        // Get Supabase admin client
        const supabaseAdmin = getSupabaseAdmin()
        
        if (!supabaseAdmin) {
            const response: ApiResponse = {
                success: false,
                error: 'Database not configured. Please set up Supabase environment variables.'
            }
            return NextResponse.json(response, { status: 503 })
        }
        
        const body = await request.json() as ProviderRegistrationData

        // Validate required fields
        const errors: string[] = []

        if (!body.primary_service || !VALID_SERVICES.includes(body.primary_service)) {
            errors.push('Invalid service category')
        }

        if (!body.first_name?.trim()) {
            errors.push('First name is required')
        }

        if (!body.last_name?.trim()) {
            errors.push('Last name is required')
        }

        if (!body.email || !isValidEmail(body.email)) {
            errors.push('Valid email is required')
        }

        if (!body.phone || !isValidPhone(body.phone)) {
            errors.push('Valid Indian phone number is required')
        }

        if (!body.password || body.password.length < 8) {
            errors.push('Password must be at least 8 characters')
        }

        if (!body.address?.street?.trim()) {
            errors.push('Street address is required')
        }

        if (!body.address?.city?.trim()) {
            errors.push('City is required')
        }

        if (!body.address?.postcode || !isValidPostcode(body.address.postcode)) {
            errors.push('Valid Indian PIN code is required')
        }

        if (!body.location?.latitude || !body.location?.longitude) {
            errors.push('Location coordinates are required')
        }

        // Validate coordinates are within India bounds (approximately)
        if (body.location) {
            const { latitude, longitude } = body.location
            if (latitude < 8 || latitude > 35 || longitude < 68 || longitude > 97) {
                errors.push('Location must be within India')
            }
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
                role: 'provider'
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

        // Create provider profile with PostGIS point
        const { data: provider, error: providerError } = await supabaseAdmin
            .from('providers')
            .insert({
                user_id: userId,
                first_name: body.first_name.trim(),
                last_name: body.last_name.trim(),
                email: body.email.toLowerCase(),
                phone: body.phone.replace(/\s/g, ''),
                business_name: body.business_name?.trim() || null,
                description: body.description?.trim() || null,
                primary_service: body.primary_service,
                additional_services: [],
                address_street: body.address.street.trim(),
                address_city: body.address.city.trim(),
                address_postcode: body.address.postcode.toUpperCase().trim(),
                address_county: body.address.county?.trim() || null,
                address_country: body.address.country || 'India',
                formatted_address: body.address.formatted_address || null,
                latitude: body.location.latitude,
                longitude: body.location.longitude,
                service_radius_km: body.service_radius_km || 10,
                years_experience: body.years_experience || null,
                hourly_rate: body.hourly_rate || null,
                status: 'active',
                verification_status: 'pending',
                is_available: true
            })
            .select()
            .single()

        if (providerError) {
            // Rollback: delete the auth user if provider creation fails
            await supabaseAdmin.auth.admin.deleteUser(userId)
            
            console.error('Provider error:', providerError)
            const response: ApiResponse = {
                success: false,
                error: providerError.message
            }
            return NextResponse.json(response, { status: 400 })
        }

        // Update the location field with PostGIS point
        // This may use a database function or trigger in production
        const { error: locationError } = await supabaseAdmin.rpc('update_provider_location', {
            provider_id: provider.id,
            lat: body.location.latitude,
            lng: body.location.longitude
        })
        
        if (locationError) {
            // Location update via RPC failed, location will be updated via trigger
            console.log('RPC location update skipped (may use trigger instead)')
        }

        // Create profile record
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: userId,
                email: body.email.toLowerCase(),
                name: `${body.first_name} ${body.last_name}`,
                role: 'provider',
                phone: body.phone.replace(/\s/g, '')
            })
        
        if (profileError) {
            console.error('Profile creation error:', profileError)
        }

        const response: ApiResponse = {
            success: true,
            data: {
                provider_id: provider.id,
                user_id: userId,
                email: body.email
            },
            message: 'Provider registered successfully'
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
