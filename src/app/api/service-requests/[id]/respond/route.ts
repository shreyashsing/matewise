/**
 * Service Request Response API Route
 * PATCH /api/service-requests/[id]/respond - Accept or reject a request
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { ApiResponse } from '@/types'

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

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabaseAdmin = getSupabaseAdmin()
        
        if (!supabaseAdmin) {
            return NextResponse.json({
                success: false,
                error: 'Database not configured'
            } as ApiResponse, { status: 503 })
        }

        const { id } = await params
        const body = await request.json()
        const { action } = body // 'accept' or 'reject'

        if (!action || !['accept', 'reject'].includes(action)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid action. Must be "accept" or "reject"'
            } as ApiResponse, { status: 400 })
        }

        // Get the current request
        const { data: currentRequest, error: fetchError } = await supabaseAdmin
            .from('service_requests')
            .select('*')
            .eq('id', id)
            .single()

        if (fetchError || !currentRequest) {
            return NextResponse.json({
                success: false,
                error: 'Service request not found'
            } as ApiResponse, { status: 404 })
        }

        // Check if request is still pending
        if (currentRequest.status !== 'pending') {
            return NextResponse.json({
                success: false,
                error: `Request already ${currentRequest.status}`
            } as ApiResponse, { status: 400 })
        }

        // Check if request has expired
        if (new Date(currentRequest.expires_at) < new Date()) {
            // Update to expired status
            await supabaseAdmin
                .from('service_requests')
                .update({ status: 'expired' })
                .eq('id', id)

            return NextResponse.json({
                success: false,
                error: 'Request has expired'
            } as ApiResponse, { status: 400 })
        }

        // Update the request status
        const newStatus = action === 'accept' ? 'accepted' : 'rejected'
        
        const { data: updatedRequest, error: updateError } = await supabaseAdmin
            .from('service_requests')
            .update({
                status: newStatus,
                responded_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating request:', updateError)
            return NextResponse.json({
                success: false,
                error: 'Failed to update request'
            } as ApiResponse, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data: updatedRequest,
            message: `Request ${newStatus} successfully`
        } as ApiResponse)

    } catch (error) {
        console.error('Respond to request error:', error)
        return NextResponse.json({
            success: false,
            error: 'An unexpected error occurred'
        } as ApiResponse, { status: 500 })
    }
}
