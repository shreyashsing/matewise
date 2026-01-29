/**
 * Service Requests API Route
 * POST /api/service-requests - Create a new service request
 * GET /api/service-requests - Get requests for a user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { ApiResponse, ServiceCategory } from '@/types'

// Create admin client
function getSupabaseAdmin() {
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

// Create a new service request
export async function POST(request: NextRequest) {
    try {
        const supabaseAdmin = getSupabaseAdmin()
        
        if (!supabaseAdmin) {
            return NextResponse.json({
                success: false,
                error: 'Database not configured'
            } as ApiResponse, { status: 503 })
        }

        const body = await request.json()
        
        const {
            provider_id,
            consumer_name,
            consumer_phone,
            consumer_email,
            service_category,
            service_latitude,
            service_longitude,
            service_address,
            distance_km
        } = body

        // Validate required fields
        if (!provider_id || !consumer_name || !service_category) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: provider_id, consumer_name, and service_category are required'
            } as ApiResponse, { status: 400 })
        }

        // Check if there's already a pending request from this consumer to this provider
        const { data: existingRequest } = await supabaseAdmin
            .from('service_requests')
            .select('id')
            .eq('provider_id', provider_id)
            .eq('consumer_email', consumer_email)
            .eq('status', 'pending')
            .single()

        if (existingRequest) {
            return NextResponse.json({
                success: false,
                error: 'You already have a pending request with this provider'
            } as ApiResponse, { status: 400 })
        }

        // Create the service request with 30-second expiration
        const expiresAt = new Date(Date.now() + 30 * 1000).toISOString()

        const { data: serviceRequest, error } = await supabaseAdmin
            .from('service_requests')
            .insert({
                provider_id,
                consumer_id: body.consumer_id || crypto.randomUUID(), // Use provided or generate temp ID
                consumer_name,
                consumer_phone: consumer_phone || null,
                consumer_email: consumer_email || null,
                service_category,
                service_latitude: service_latitude || null,
                service_longitude: service_longitude || null,
                service_address: service_address || null,
                distance_km: distance_km || null,
                status: 'pending',
                expires_at: expiresAt
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating service request:', error)
            return NextResponse.json({
                success: false,
                error: error.message
            } as ApiResponse, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data: serviceRequest,
            message: 'Service request sent successfully'
        } as ApiResponse, { status: 201 })

    } catch (error) {
        console.error('Service request error:', error)
        return NextResponse.json({
            success: false,
            error: 'An unexpected error occurred'
        } as ApiResponse, { status: 500 })
    }
}

// Get service requests
export async function GET(request: NextRequest) {
    try {
        const supabaseAdmin = getSupabaseAdmin()
        
        if (!supabaseAdmin) {
            return NextResponse.json({
                success: false,
                error: 'Database not configured'
            } as ApiResponse, { status: 503 })
        }

        const { searchParams } = new URL(request.url)
        const requestId = searchParams.get('id')

        if (requestId) {
            // Get specific request
            const { data, error } = await supabaseAdmin
                .from('service_requests')
                .select('*')
                .eq('id', requestId)
                .single()

            if (error) {
                return NextResponse.json({
                    success: false,
                    error: 'Request not found'
                } as ApiResponse, { status: 404 })
            }

            return NextResponse.json({
                success: true,
                data
            } as ApiResponse)
        }

        return NextResponse.json({
            success: false,
            error: 'Request ID required'
        } as ApiResponse, { status: 400 })

    } catch (error) {
        console.error('Get request error:', error)
        return NextResponse.json({
            success: false,
            error: 'An unexpected error occurred'
        } as ApiResponse, { status: 500 })
    }
}
