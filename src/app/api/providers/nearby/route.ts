/**
 * Nearby Providers Search API Route
 * GET /api/providers/nearby
 * 
 * Query params:
 * - lat: latitude (required)
 * - lng: longitude (required)
 * - radius: search radius in km (default: 10)
 * - service: service category filter (optional)
 * - rating: minimum rating filter (optional)
 * - available: filter by availability (default: true)
 * - limit: max results (default: 50)
 * - offset: pagination offset (default: 0)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { ApiResponse, ProviderSearchResult, ServiceCategory } from '@/types'

const VALID_SERVICES: ServiceCategory[] = [
    'cleaning', 'repairs', 'moving', 'gardening', 'plumbing',
    'painting', 'tutoring', 'care', 'electrical', 'pets'
]

export async function GET(request: NextRequest) {
    try {
        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
            const response: ApiResponse = {
                success: false,
                error: 'Database not configured. Please set up Supabase environment variables.'
            }
            return NextResponse.json(response, { status: 503 })
        }
        
        const { searchParams } = new URL(request.url)
        
        // Parse and validate required parameters
        const latStr = searchParams.get('lat')
        const lngStr = searchParams.get('lng')
        
        if (!latStr || !lngStr) {
            const response: ApiResponse = {
                success: false,
                error: 'Latitude (lat) and longitude (lng) are required'
            }
            return NextResponse.json(response, { status: 400 })
        }
        
        const latitude = parseFloat(latStr)
        const longitude = parseFloat(lngStr)
        
        if (isNaN(latitude) || isNaN(longitude)) {
            const response: ApiResponse = {
                success: false,
                error: 'Invalid latitude or longitude values'
            }
            return NextResponse.json(response, { status: 400 })
        }
        
        // Validate coordinates are within India bounds
        if (latitude < 8 || latitude > 35 || longitude < 68 || longitude > 97) {
            const response: ApiResponse = {
                success: false,
                error: 'Coordinates must be within India'
            }
            return NextResponse.json(response, { status: 400 })
        }
        
        // Parse optional parameters
        const radiusKm = Math.min(parseFloat(searchParams.get('radius') || '10'), 100)
        const serviceCategory = searchParams.get('service') as ServiceCategory | null
        const minRating = searchParams.get('rating') ? parseFloat(searchParams.get('rating')!) : null
        const availableOnly = searchParams.get('available') !== 'false'
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
        const offset = parseInt(searchParams.get('offset') || '0')
        
        // Validate service category if provided
        if (serviceCategory && !VALID_SERVICES.includes(serviceCategory)) {
            const response: ApiResponse = {
                success: false,
                error: `Invalid service category. Must be one of: ${VALID_SERVICES.join(', ')}`
            }
            return NextResponse.json(response, { status: 400 })
        }
        
        // Call the PostgreSQL function for geospatial search
        const { data, error } = await supabase.rpc('find_nearby_providers', {
            search_lat: latitude,
            search_lng: longitude,
            radius_km: radiusKm,
            service_filter: serviceCategory,
            min_rating_filter: minRating,
            available_only: availableOnly,
            result_limit: limit,
            result_offset: offset
        })
        
        if (error) {
            console.error('Database error:', error)
            
            // If the function doesn't exist, fall back to basic query
            if (error.message.includes('function') || error.code === '42883') {
                return await fallbackSearch(
                    latitude,
                    longitude,
                    radiusKm,
                    serviceCategory,
                    minRating,
                    availableOnly,
                    limit,
                    offset
                )
            }
            
            const response: ApiResponse = {
                success: false,
                error: 'Failed to search for providers'
            }
            return NextResponse.json(response, { status: 500 })
        }
        
        // Map the results to our expected format
        const providers: ProviderSearchResult[] = (data || []).map((row: Record<string, unknown>) => ({
            id: row.id as string,
            user_id: row.user_id as string,
            first_name: row.first_name as string,
            last_name: row.last_name as string,
            business_name: (row.business_name as string) || '',
            email: row.email as string,
            phone: row.phone as string,
            description: row.description as string | undefined,
            primary_service: row.primary_service as ServiceCategory,
            additional_services: (row.additional_services as ServiceCategory[]) || [],
            address: {
                street: row.address_street as string,
                city: row.address_city as string,
                postcode: row.address_postcode as string,
                county: row.address_county as string | undefined,
                country: row.address_country as string,
                formatted_address: row.formatted_address as string | undefined
            },
            location: {
                latitude: row.latitude as number,
                longitude: row.longitude as number
            },
            service_radius_km: row.service_radius_km as number,
            years_experience: row.years_experience as number | undefined,
            hourly_rate: row.hourly_rate as number | undefined,
            minimum_charge: row.minimum_charge as number | undefined,
            status: row.status as ProviderSearchResult['status'],
            verification_status: row.verification_status as ProviderSearchResult['verification_status'],
            trust_score: row.trust_score as number | undefined,
            rating_average: row.rating_average as number | undefined,
            total_reviews: (row.total_reviews as number) || 0,
            total_jobs_completed: (row.total_jobs_completed as number) || 0,
            is_available: row.is_available as boolean,
            availability_hours: row.availability_hours as ProviderSearchResult['availability_hours'],
            created_at: row.created_at as string,
            updated_at: row.updated_at as string,
            distance_km: Math.round(((row.distance_km as number) || 0) * 100) / 100
        }))
        
        const response: ApiResponse<ProviderSearchResult[]> = {
            success: true,
            data: providers,
            message: `Found ${providers.length} providers within ${radiusKm}km`
        }
        
        return NextResponse.json(response, { status: 200 })
        
    } catch (error) {
        console.error('Search error:', error)
        const response: ApiResponse = {
            success: false,
            error: 'An unexpected error occurred'
        }
        return NextResponse.json(response, { status: 500 })
    }
}

/**
 * Fallback search without PostGIS function
 * Uses basic filtering when the RPC function is not available
 */
async function fallbackSearch(
    latitude: number,
    longitude: number,
    radiusKm: number,
    serviceCategory: ServiceCategory | null,
    minRating: number | null,
    availableOnly: boolean,
    limit: number,
    offset: number
): Promise<NextResponse> {
    try {
        // Build query
        let query = supabase
            .from('providers')
            .select('*')
            .in('status', ['active', 'verified', 'pending'])
        
        if (serviceCategory) {
            query = query.eq('primary_service', serviceCategory)
        }
        
        if (minRating) {
            query = query.gte('rating_average', minRating)
        }
        
        if (availableOnly) {
            query = query.eq('is_available', true)
        }
        
        const { data, error } = await query.range(offset, offset + limit - 1)
        
        if (error) {
            const response: ApiResponse = {
                success: false,
                error: error.message
            }
            return NextResponse.json(response, { status: 500 })
        }
        
        // Calculate distances and filter in JavaScript (fallback)
        const providersWithDistance = (data || [])
            .map((row: Record<string, unknown>) => {
                const providerLat = row.latitude as number
                const providerLng = row.longitude as number
                const distance = calculateDistance(latitude, longitude, providerLat, providerLng)
                
                return {
                    id: row.id as string,
                    user_id: row.user_id as string,
                    first_name: row.first_name as string,
                    last_name: row.last_name as string,
                    business_name: (row.business_name as string) || '',
                    email: row.email as string,
                    phone: row.phone as string,
                    description: row.description as string | undefined,
                    primary_service: row.primary_service as ServiceCategory,
                    additional_services: (row.additional_services as ServiceCategory[]) || [],
                    address: {
                        street: row.address_street as string,
                        city: row.address_city as string,
                        postcode: row.address_postcode as string,
                        county: row.address_county as string | undefined,
                        country: row.address_country as string,
                        formatted_address: row.formatted_address as string | undefined
                    },
                    location: {
                        latitude: providerLat,
                        longitude: providerLng
                    },
                    service_radius_km: row.service_radius_km as number,
                    years_experience: row.years_experience as number | undefined,
                    hourly_rate: row.hourly_rate as number | undefined,
                    minimum_charge: row.minimum_charge as number | undefined,
                    status: row.status as ProviderSearchResult['status'],
                    verification_status: row.verification_status as ProviderSearchResult['verification_status'],
                    trust_score: row.trust_score as number | undefined,
                    rating_average: row.rating_average as number | undefined,
                    total_reviews: (row.total_reviews as number) || 0,
                    total_jobs_completed: (row.total_jobs_completed as number) || 0,
                    is_available: row.is_available as boolean,
                    availability_hours: row.availability_hours as ProviderSearchResult['availability_hours'],
                    created_at: row.created_at as string,
                    updated_at: row.updated_at as string,
                    distance_km: Math.round(distance * 100) / 100
                } as ProviderSearchResult
            })
            .filter(p => p.distance_km <= radiusKm)
            .sort((a, b) => a.distance_km - b.distance_km)
        
        const response: ApiResponse<ProviderSearchResult[]> = {
            success: true,
            data: providersWithDistance,
            message: `Found ${providersWithDistance.length} providers within ${radiusKm}km (fallback search)`
        }
        
        return NextResponse.json(response, { status: 200 })
        
    } catch (error) {
        console.error('Fallback search error:', error)
        const response: ApiResponse = {
            success: false,
            error: 'Search failed'
        }
        return NextResponse.json(response, { status: 500 })
    }
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180)
}
