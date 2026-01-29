/**
 * Get Provider by ID API Route
 * GET /api/providers/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { ApiResponse, Provider, ServiceCategory } from '@/types'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
            const response: ApiResponse = {
                success: false,
                error: 'Database not configured. Please set up Supabase environment variables.'
            }
            return NextResponse.json(response, { status: 503 })
        }
        
        const { id } = await params
        const { searchParams } = new URL(request.url)
        const byUserId = searchParams.get('byUserId') === 'true'
        
        if (!id) {
            const response: ApiResponse = {
                success: false,
                error: 'Provider ID is required'
            }
            return NextResponse.json(response, { status: 400 })
        }
        
        // Query by user_id or provider id based on query param
        const query = supabase
            .from('providers')
            .select('*')
        
        if (byUserId) {
            query.eq('user_id', id)
        } else {
            query.eq('id', id)
        }
        
        const { data, error } = await query.single()
        
        if (error) {
            if (error.code === 'PGRST116') {
                const response: ApiResponse = {
                    success: false,
                    error: 'Provider not found'
                }
                return NextResponse.json(response, { status: 404 })
            }
            
            const response: ApiResponse = {
                success: false,
                error: error.message
            }
            return NextResponse.json(response, { status: 500 })
        }
        
        if (!data) {
            const response: ApiResponse = {
                success: false,
                error: 'Provider not found'
            }
            return NextResponse.json(response, { status: 404 })
        }
        
        // Map database row to Provider type
        const provider: Provider = {
            id: data.id,
            user_id: data.user_id,
            first_name: data.first_name,
            last_name: data.last_name,
            business_name: data.business_name || '',
            email: data.email,
            phone: data.phone,
            description: data.description || undefined,
            primary_service: data.primary_service as ServiceCategory,
            additional_services: data.additional_services || [],
            address: {
                street: data.address_street,
                city: data.address_city,
                postcode: data.address_postcode,
                county: data.address_county || undefined,
                country: data.address_country,
                formatted_address: data.formatted_address || undefined
            },
            location: {
                latitude: data.latitude,
                longitude: data.longitude
            },
            service_radius_km: data.service_radius_km,
            years_experience: data.years_experience || undefined,
            hourly_rate: data.hourly_rate || undefined,
            minimum_charge: data.minimum_charge || undefined,
            status: data.status,
            verification_status: data.verification_status,
            trust_score: data.trust_score || undefined,
            rating_average: data.rating_average || undefined,
            total_reviews: data.total_reviews || 0,
            total_jobs_completed: data.total_jobs_completed || 0,
            is_available: data.is_available,
            availability_hours: data.availability_hours || undefined,
            created_at: data.created_at,
            updated_at: data.updated_at
        }
        
        const response: ApiResponse<Provider> = {
            success: true,
            data: provider
        }
        
        return NextResponse.json(response, { status: 200 })
        
    } catch (error) {
        console.error('Get provider error:', error)
        const response: ApiResponse = {
            success: false,
            error: 'An unexpected error occurred'
        }
        return NextResponse.json(response, { status: 500 })
    }
}
