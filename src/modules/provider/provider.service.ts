/**
 * Provider Service - Business logic for provider operations
 */

import { supabase } from '@/lib/supabase'
import type {
    Provider,
    ProviderRegistrationData,
    ProviderSearchResult,
    NearbyProviderSearchParams,
    ApiResponse,
    GeoLocation,
    Address,
    ServiceCategory
} from '@/types'

// Database row type matching Supabase structure
interface ProviderRow {
    id: string
    user_id: string
    first_name: string
    last_name: string
    email: string
    phone: string
    business_name: string | null
    description: string | null
    primary_service: ServiceCategory
    additional_services: ServiceCategory[]
    address_street: string
    address_city: string
    address_postcode: string
    address_county: string | null
    address_country: string
    formatted_address: string | null
    latitude: number
    longitude: number
    service_radius_km: number
    years_experience: number | null
    hourly_rate: number | null
    minimum_charge: number | null
    status: Provider['status']
    verification_status: Provider['verification_status']
    trust_score: number | null
    rating_average: number | null
    total_reviews: number
    total_jobs_completed: number
    is_available: boolean
    availability_hours: Provider['availability_hours'] | null
    created_at: string
    updated_at: string
    distance_km?: number
}

export class ProviderService {
    /**
     * Register a new service provider
     */
    static async registerProvider(
        userId: string,
        data: ProviderRegistrationData
    ): Promise<ApiResponse<Provider>> {
        try {
            // Validate required fields
            if (!data.primary_service || !data.first_name || !data.last_name || !data.email || !data.phone) {
                return {
                    success: false,
                    error: 'Missing required fields'
                }
            }

            if (!data.address || !data.location) {
                return {
                    success: false,
                    error: 'Address and location are required'
                }
            }

            // Check if provider already exists for this user
            const { data: existingProvider } = await supabase
                .from('providers')
                .select('id')
                .eq('user_id', userId)
                .single()

            if (existingProvider) {
                return {
                    success: false,
                    error: 'Provider profile already exists for this user'
                }
            }

            // Insert provider record
            const { data: provider, error } = await supabase
                .from('providers')
                .insert({
                    user_id: userId,
                    first_name: data.first_name,
                    last_name: data.last_name,
                    email: data.email,
                    phone: data.phone,
                    business_name: data.business_name || null,
                    description: data.description || null,
                    primary_service: data.primary_service,
                    additional_services: [],
                    address_street: data.address.street,
                    address_city: data.address.city,
                    address_postcode: data.address.postcode,
                    address_county: data.address.county || null,
                    address_country: data.address.country || 'United Kingdom',
                    formatted_address: data.address.formatted_address || null,
                    latitude: data.location.latitude,
                    longitude: data.location.longitude,
                    // PostGIS point is created via trigger or direct SQL
                    service_radius_km: data.service_radius_km || 10,
                    years_experience: data.years_experience || null,
                    hourly_rate: data.hourly_rate || null,
                    status: 'pending',
                    verification_status: 'pending',
                    is_available: true
                })
                .select()
                .single()

            if (error) {
                console.error('Error registering provider:', error)
                return {
                    success: false,
                    error: error.message
                }
            }

            return {
                success: true,
                data: this.mapRowToProvider(provider as ProviderRow),
                message: 'Provider registered successfully'
            }
        } catch (error) {
            console.error('Error in registerProvider:', error)
            return {
                success: false,
                error: 'An unexpected error occurred'
            }
        }
    }

    /**
     * Get provider by ID
     */
    static async getProviderById(providerId: string): Promise<ApiResponse<Provider>> {
        try {
            const { data, error } = await supabase
                .from('providers')
                .select('*')
                .eq('id', providerId)
                .single()

            if (error) {
                return {
                    success: false,
                    error: error.message
                }
            }

            if (!data) {
                return {
                    success: false,
                    error: 'Provider not found'
                }
            }

            return {
                success: true,
                data: this.mapRowToProvider(data as ProviderRow)
            }
        } catch (error) {
            console.error('Error in getProviderById:', error)
            return {
                success: false,
                error: 'An unexpected error occurred'
            }
        }
    }

    /**
     * Get provider by user ID
     */
    static async getProviderByUserId(userId: string): Promise<ApiResponse<Provider>> {
        try {
            const { data, error } = await supabase
                .from('providers')
                .select('*')
                .eq('user_id', userId)
                .single()

            if (error) {
                return {
                    success: false,
                    error: error.message
                }
            }

            if (!data) {
                return {
                    success: false,
                    error: 'Provider not found'
                }
            }

            return {
                success: true,
                data: this.mapRowToProvider(data as ProviderRow)
            }
        } catch (error) {
            console.error('Error in getProviderByUserId:', error)
            return {
                success: false,
                error: 'An unexpected error occurred'
            }
        }
    }

    /**
     * Search for nearby providers using PostGIS
     */
    static async findNearbyProviders(
        params: NearbyProviderSearchParams
    ): Promise<ApiResponse<ProviderSearchResult[]>> {
        try {
            const {
                latitude,
                longitude,
                radius_km = 10,
                service_category,
                min_rating,
                is_available = true,
                limit = 50,
                offset = 0
            } = params

            // Use the PostgreSQL function for geospatial search
            const { data, error } = await supabase
                .rpc('find_nearby_providers', {
                    search_lat: latitude,
                    search_lng: longitude,
                    radius_km: radius_km,
                    service_filter: service_category || null,
                    min_rating_filter: min_rating || null,
                    available_only: is_available,
                    result_limit: limit,
                    result_offset: offset
                })

            if (error) {
                console.error('Error finding nearby providers:', error)
                return {
                    success: false,
                    error: error.message
                }
            }

            const providers: ProviderSearchResult[] = (data as ProviderRow[]).map(row => ({
                ...this.mapRowToProvider(row),
                distance_km: row.distance_km || 0
            }))

            return {
                success: true,
                data: providers
            }
        } catch (error) {
            console.error('Error in findNearbyProviders:', error)
            return {
                success: false,
                error: 'An unexpected error occurred'
            }
        }
    }

    /**
     * Update provider profile
     */
    static async updateProvider(
        providerId: string,
        userId: string,
        updates: Partial<Provider>
    ): Promise<ApiResponse<Provider>> {
        try {
            // Build update object
            const updateData: Record<string, unknown> = {}

            if (updates.first_name) updateData.first_name = updates.first_name
            if (updates.last_name) updateData.last_name = updates.last_name
            if (updates.phone) updateData.phone = updates.phone
            if (updates.business_name !== undefined) updateData.business_name = updates.business_name
            if (updates.description !== undefined) updateData.description = updates.description
            if (updates.primary_service) updateData.primary_service = updates.primary_service
            if (updates.additional_services) updateData.additional_services = updates.additional_services
            if (updates.years_experience !== undefined) updateData.years_experience = updates.years_experience
            if (updates.hourly_rate !== undefined) updateData.hourly_rate = updates.hourly_rate
            if (updates.minimum_charge !== undefined) updateData.minimum_charge = updates.minimum_charge
            if (updates.is_available !== undefined) updateData.is_available = updates.is_available
            if (updates.availability_hours !== undefined) updateData.availability_hours = updates.availability_hours
            if (updates.service_radius_km) updateData.service_radius_km = updates.service_radius_km

            // Update address if provided
            if (updates.address) {
                updateData.address_street = updates.address.street
                updateData.address_city = updates.address.city
                updateData.address_postcode = updates.address.postcode
                updateData.address_county = updates.address.county || null
                updateData.address_country = updates.address.country || 'United Kingdom'
                updateData.formatted_address = updates.address.formatted_address || null
            }

            // Update location if provided
            if (updates.location) {
                updateData.latitude = updates.location.latitude
                updateData.longitude = updates.location.longitude
            }

            const { data, error } = await supabase
                .from('providers')
                .update(updateData)
                .eq('id', providerId)
                .eq('user_id', userId) // Ensure user owns this provider
                .select()
                .single()

            if (error) {
                return {
                    success: false,
                    error: error.message
                }
            }

            return {
                success: true,
                data: this.mapRowToProvider(data as ProviderRow),
                message: 'Provider updated successfully'
            }
        } catch (error) {
            console.error('Error in updateProvider:', error)
            return {
                success: false,
                error: 'An unexpected error occurred'
            }
        }
    }

    /**
     * Get providers by service category
     */
    static async getProvidersByService(
        serviceCategory: ServiceCategory,
        limit = 50
    ): Promise<ApiResponse<Provider[]>> {
        try {
            const { data, error } = await supabase
                .from('providers')
                .select('*')
                .eq('primary_service', serviceCategory)
                .in('status', ['active', 'verified'])
                .eq('is_available', true)
                .limit(limit)

            if (error) {
                return {
                    success: false,
                    error: error.message
                }
            }

            return {
                success: true,
                data: (data as ProviderRow[]).map(row => this.mapRowToProvider(row))
            }
        } catch (error) {
            console.error('Error in getProvidersByService:', error)
            return {
                success: false,
                error: 'An unexpected error occurred'
            }
        }
    }

    /**
     * Map database row to Provider type
     */
    private static mapRowToProvider(row: ProviderRow): Provider {
        const address: Address = {
            street: row.address_street,
            city: row.address_city,
            postcode: row.address_postcode,
            county: row.address_county || undefined,
            country: row.address_country,
            formatted_address: row.formatted_address || undefined
        }

        const location: GeoLocation = {
            latitude: row.latitude,
            longitude: row.longitude
        }

        return {
            id: row.id,
            user_id: row.user_id,
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
            phone: row.phone,
            business_name: row.business_name || '',
            description: row.description || undefined,
            primary_service: row.primary_service,
            additional_services: row.additional_services || [],
            address,
            location,
            service_radius_km: row.service_radius_km,
            years_experience: row.years_experience || undefined,
            hourly_rate: row.hourly_rate || undefined,
            minimum_charge: row.minimum_charge || undefined,
            status: row.status,
            verification_status: row.verification_status,
            trust_score: row.trust_score || undefined,
            rating_average: row.rating_average || undefined,
            total_reviews: row.total_reviews || 0,
            total_jobs_completed: row.total_jobs_completed || 0,
            is_available: row.is_available,
            availability_hours: row.availability_hours || undefined,
            created_at: row.created_at,
            updated_at: row.updated_at
        }
    }
}
