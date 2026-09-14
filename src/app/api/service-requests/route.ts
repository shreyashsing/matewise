/**
 * Service Requests API Route
 * POST /api/service-requests - Create a new service request
 * GET /api/service-requests - Get requests for a user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { ApiResponse, ServiceCategory } from '@/types'
import { getAuthenticatedUser } from '@/lib/api-auth'

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

        // A service request must come from a real, logged-in consumer -- their
        // identity (id, name, phone, email) is derived server-side from their
        // account below, never trusted from the request body.
        const user = await getAuthenticatedUser(request, supabaseAdmin)
        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required'
            } as ApiResponse, { status: 401 })
        }

        const { data: consumer, error: consumerLookupError } = await supabaseAdmin
            .from('consumers')
            .select('id, first_name, last_name, email, phone')
            .eq('user_id', user.id)
            .single()

        if (consumerLookupError || !consumer) {
            return NextResponse.json({
                success: false,
                error: 'Consumer profile not found for this account'
            } as ApiResponse, { status: 404 })
        }

        const body = await request.json()

        const {
            provider_id,
            service_category,
            service_latitude,
            service_longitude,
            service_address,
            distance_km
        } = body

        // Validate required fields
        if (!provider_id || !service_category) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: provider_id and service_category are required'
            } as ApiResponse, { status: 400 })
        }

        // Check if there's already a pending request from this consumer to this provider
        const { data: existingRequest } = await supabaseAdmin
            .from('service_requests')
            .select('id')
            .eq('provider_id', provider_id)
            .eq('consumer_id', consumer.id)
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
                consumer_id: consumer.id,
                consumer_name: `${consumer.first_name} ${consumer.last_name}`.trim(),
                consumer_phone: consumer.phone || null,
                consumer_email: consumer.email,
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

            if (error || !data) {
                return NextResponse.json({
                    success: false,
                    error: 'Request not found'
                } as ApiResponse, { status: 404 })
            }

            // Only the consumer who made this request or the provider it was
            // sent to may view it.
            const user = await getAuthenticatedUser(request, supabaseAdmin)
            if (!user) {
                return NextResponse.json({
                    success: false,
                    error: 'Authentication required'
                } as ApiResponse, { status: 401 })
            }

            const [{ data: consumer }, { data: provider }] = await Promise.all([
                supabaseAdmin.from('consumers').select('id').eq('user_id', user.id).single(),
                supabaseAdmin.from('providers').select('id').eq('user_id', user.id).single()
            ])

            const isOwningConsumer = consumer?.id === data.consumer_id
            const isOwningProvider = provider?.id === data.provider_id

            if (!isOwningConsumer && !isOwningProvider) {
                return NextResponse.json({
                    success: false,
                    error: 'You are not authorized to view this request'
                } as ApiResponse, { status: 403 })
            }

            // Never hand the OTP out through this general-purpose route -- it's
            // fetched by both the provider and consumer apps, and the OTP is
            // only meant to reach the consumer. See
            // GET /api/service-requests/[id]/otp for the one place it's served.
            const { otp: _otp, ...safeData } = data

            return NextResponse.json({
                success: true,
                data: safeData
            } as ApiResponse)
        }

        // List the caller's own requests (their job/booking history).
        // scope=provider -> every request sent to their provider profile
        // scope=consumer -> every request they've sent as a consumer
        const scope = searchParams.get('scope')
        if (scope === 'provider' || scope === 'consumer') {
            const user = await getAuthenticatedUser(request, supabaseAdmin)
            if (!user) {
                return NextResponse.json({
                    success: false,
                    error: 'Authentication required'
                } as ApiResponse, { status: 401 })
            }

            const statusFilter = searchParams.get('status')
            const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

            if (scope === 'provider') {
                const { data: provider } = await supabaseAdmin
                    .from('providers')
                    .select('id')
                    .eq('user_id', user.id)
                    .single()

                if (!provider) {
                    return NextResponse.json({
                        success: false,
                        error: 'No provider profile found for this account'
                    } as ApiResponse, { status: 404 })
                }

                let query = supabaseAdmin
                    .from('service_requests')
                    .select('*')
                    .eq('provider_id', provider.id)
                    .order('created_at', { ascending: false })
                    .limit(limit)

                if (statusFilter) {
                    query = query.eq('status', statusFilter)
                }

                const { data, error } = await query
                if (error) {
                    return NextResponse.json({
                        success: false,
                        error: error.message
                    } as ApiResponse, { status: 500 })
                }

                const safeRows = (data || []).map(({ otp: _otp, ...rest }) => rest)

                return NextResponse.json({
                    success: true,
                    data: safeRows
                } as ApiResponse)
            }

            // scope === 'consumer'
            const { data: consumer } = await supabaseAdmin
                .from('consumers')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!consumer) {
                return NextResponse.json({
                    success: false,
                    error: 'No consumer profile found for this account'
                } as ApiResponse, { status: 404 })
            }

            let query = supabaseAdmin
                .from('service_requests')
                .select('*, providers(id, business_name, first_name, last_name, primary_service, hourly_rate, phone)')
                .eq('consumer_id', consumer.id)
                .order('created_at', { ascending: false })
                .limit(limit)

            if (statusFilter) {
                query = query.eq('status', statusFilter)
            }

            const { data, error } = await query
            if (error) {
                return NextResponse.json({
                    success: false,
                    error: error.message
                } as ApiResponse, { status: 500 })
            }

            const safeRows = (data || []).map(({ otp: _otp, ...rest }) => rest)

            return NextResponse.json({
                success: true,
                data: safeRows
            } as ApiResponse)
        }

        return NextResponse.json({
            success: false,
            error: 'Request ID or scope required'
        } as ApiResponse, { status: 400 })

    } catch (error) {
        console.error('Get request error:', error)
        return NextResponse.json({
            success: false,
            error: 'An unexpected error occurred'
        } as ApiResponse, { status: 500 })
    }
}
