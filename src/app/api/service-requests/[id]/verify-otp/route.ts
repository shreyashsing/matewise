/**
 * OTP Verification API Route
 * POST /api/service-requests/[id]/verify-otp - Verify OTP for service confirmation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { ApiResponse } from '@/types'
import { requireOwningProvider } from '@/lib/api-auth'

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

export async function POST(
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
        const { otp } = body

        if (!otp) {
            return NextResponse.json({
                success: false,
                error: 'OTP is required'
            } as ApiResponse, { status: 400 })
        }

        // Get the service request
        const { data: serviceRequest, error: fetchError } = await supabaseAdmin
            .from('service_requests')
            .select('*')
            .eq('id', id)
            .single()

        if (fetchError || !serviceRequest) {
            return NextResponse.json({
                success: false,
                error: 'Service request not found'
            } as ApiResponse, { status: 404 })
        }

        // Only the provider this request belongs to may attempt OTP verification
        const auth = await requireOwningProvider(request, supabaseAdmin, serviceRequest.provider_id)
        if (!auth.ok) {
            return NextResponse.json({
                success: false,
                error: auth.error
            } as ApiResponse, { status: auth.status })
        }

        // Check if request is accepted
        if (serviceRequest.status !== 'accepted') {
            return NextResponse.json({
                success: false,
                error: 'Service request is not in accepted status'
            } as ApiResponse, { status: 400 })
        }

        // Check if OTP already verified
        if (serviceRequest.otp_verified) {
            return NextResponse.json({
                success: false,
                error: 'OTP already verified'
            } as ApiResponse, { status: 400 })
        }

        // Verify OTP
        if (serviceRequest.otp !== otp.toString()) {
            return NextResponse.json({
                success: false,
                error: 'Invalid OTP'
            } as ApiResponse, { status: 400 })
        }

        // Update OTP verification status
        const { data: updatedRequest, error: updateError } = await supabaseAdmin
            .from('service_requests')
            .update({
                otp_verified: true
            })
            .eq('id', id)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating OTP verification:', updateError)
            return NextResponse.json({
                success: false,
                error: 'Failed to verify OTP'
            } as ApiResponse, { status: 500 })
        }

        const { otp: _otp, ...responseData } = updatedRequest

        return NextResponse.json({
            success: true,
            data: responseData,
            message: 'OTP verified successfully'
        } as ApiResponse)

    } catch (error) {
        console.error('OTP verification error:', error)
        return NextResponse.json({
            success: false,
            error: 'An unexpected error occurred'
        } as ApiResponse, { status: 500 })
    }
}
