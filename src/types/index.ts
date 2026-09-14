/**
 * Shared TypeScript types and interfaces for MateWise platform
 */

// ============================================
// Base Types
// ============================================

export interface User {
    id: string
    email: string
    name?: string
    role: 'consumer' | 'provider' | 'admin'
    phone?: string
    avatar_url?: string
    created_at: string
    updated_at: string
}

// ============================================
// Service Types
// ============================================

export type ServiceCategory = 
    | 'cleaning'
    | 'repairs'
    | 'moving'
    | 'gardening'
    | 'plumbing'
    | 'painting'
    | 'tutoring'
    | 'care'
    | 'electrical'
    | 'pets'

export interface ServiceType {
    id: ServiceCategory
    title: string
    description: string
    icon: string
}

// ============================================
// Location Types
// ============================================

export interface GeoLocation {
    latitude: number
    longitude: number
}

export interface Address {
    street: string
    city: string
    postcode: string
    county?: string
    country: string
    formatted_address?: string
}

// ============================================
// Provider Types
// ============================================

export type ProviderStatus = 'pending' | 'verified' | 'active' | 'suspended' | 'inactive'
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'expired'

export interface Provider {
    id: string
    user_id: string
    business_name: string
    first_name: string
    last_name: string
    email: string
    phone: string
    description?: string
    
    // Services
    primary_service: ServiceCategory
    additional_services?: ServiceCategory[]
    
    // Location
    address: Address
    location: GeoLocation
    service_radius_km: number
    
    // Business details
    years_experience?: number
    hourly_rate?: number
    minimum_charge?: number
    
    // Verification & Trust
    status: ProviderStatus
    verification_status: VerificationStatus
    trust_score?: number
    rating_average?: number
    total_reviews?: number
    total_jobs_completed?: number
    
    // Availability
    is_available: boolean
    availability_hours?: AvailabilityHours
    
    // Timestamps
    created_at: string
    updated_at: string
}

export interface AvailabilityHours {
    monday?: DayHours
    tuesday?: DayHours
    wednesday?: DayHours
    thursday?: DayHours
    friday?: DayHours
    saturday?: DayHours
    sunday?: DayHours
}

export interface DayHours {
    start: string  // HH:MM format
    end: string    // HH:MM format
    is_available: boolean
}

// ============================================
// Provider Registration Types
// ============================================

export interface ProviderRegistrationData {
    // Step 1: Service Selection
    primary_service: ServiceCategory
    
    // Step 2: Personal Details
    first_name: string
    last_name: string
    email: string
    phone: string
    password: string
    
    // Step 3: Business Details
    business_name?: string
    description?: string
    years_experience?: number
    hourly_rate?: number
    
    // Verification Documents
    id_document?: File
    business_license?: File
    certifications?: File[]
    insurance_document?: File
    
    // Step 4: Location
    address: Address
    location: GeoLocation
    service_radius_km: number
}

// ============================================
// Consumer Types
// ============================================

export interface Consumer {
    id: string
    user_id: string
    first_name: string
    last_name: string
    email: string
    phone?: string
    
    // Default location
    default_address?: Address
    default_location?: GeoLocation
    
    created_at: string
    updated_at: string
}

export interface ConsumerRegistrationData {
    first_name: string
    last_name: string
    email: string
    phone?: string
    password: string
}

// ============================================
// Search Types
// ============================================

export interface NearbyProviderSearchParams {
    latitude: number
    longitude: number
    radius_km?: number  // Default 10km
    service_category?: ServiceCategory
    min_rating?: number
    is_available?: boolean
    limit?: number
    offset?: number
}

export interface ProviderSearchResult extends Provider {
    distance_km: number
}

// ============================================
// Booking Types (for future use)
// ============================================

export type BookingStatus = 
    | 'pending'
    | 'confirmed'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'disputed'

export interface Booking {
    id: string
    consumer_id: string
    provider_id: string
    service_category: ServiceCategory
    
    // Scheduling
    scheduled_date: string
    scheduled_time: string
    estimated_duration_hours: number
    
    // Location
    service_address: Address
    service_location: GeoLocation
    
    // Pricing
    estimated_price?: number
    final_price?: number
    
    // Status
    status: BookingStatus
    
    // Notes
    consumer_notes?: string
    provider_notes?: string
    
    created_at: string
    updated_at: string
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T = unknown> {
    success: boolean
    data?: T
    error?: string
    message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        total: number
        limit: number
        offset: number
        has_more: boolean
    }
}

// ============================================
// Map Types
// ============================================

export interface MapBounds {
    north: number
    south: number
    east: number
    west: number
}

export interface MapMarker {
    id: string
    position: GeoLocation
    title: string
    provider?: ProviderSearchResult
}

// ============================================
// Form Validation Types
// ============================================

export interface ValidationError {
    field: string
    message: string
}

export interface FormState<T> {
    data: T
    errors: ValidationError[]
    isValid: boolean
    isSubmitting: boolean
}

// ============================================
// Admin Types
// ============================================

export interface AdminUser {
    id: string
    email: string
}

export interface AdminStats {
    total_providers: number
    total_consumers: number
    providers_by_status: { status: ProviderStatus; count: number }[]
    providers_by_verification: { status: VerificationStatus; count: number }[]
    providers_by_service: { service: ServiceCategory; count: number }[]
    requests_by_status: { status: string; count: number }[]
    requests_by_category: { service: ServiceCategory; count: number }[]
    jobs_completed_total: number
    completed_requests_total: number
    signups_last_30_days: { date: string; consumers: number; providers: number }[]
}

// Admin API routes return raw `providers`/`consumers` table rows (flat
// address_* columns, no nested address/location object) rather than the
// mapped Provider/Consumer shape ProviderService produces for the public
// app -- these mirror the actual row shape, not the Provider/Consumer types.
export interface AdminProviderRow {
    id: string
    user_id: string
    first_name: string
    last_name: string
    email: string
    phone: string
    business_name?: string
    description?: string
    primary_service: ServiceCategory
    additional_services?: ServiceCategory[]
    address_street: string
    address_city: string
    address_postcode: string
    address_county?: string
    address_country: string
    formatted_address?: string
    latitude: number
    longitude: number
    service_radius_km: number
    years_experience?: number
    hourly_rate?: number
    minimum_charge?: number
    status: ProviderStatus
    verification_status: VerificationStatus
    trust_score?: number
    rating_average?: number
    total_reviews?: number
    total_jobs_completed?: number
    is_available: boolean
    availability_hours?: AvailabilityHours
    id_document_url?: string
    business_license_url?: string
    certification_urls?: string[]
    insurance_document_url?: string
    documents_uploaded_at?: string
    suspended_reason?: string
    admin_notes?: string
    created_at: string
    updated_at: string
    recent_service_requests?: AdminServiceRequestSummary[]
}

export interface AdminConsumerRow {
    id: string
    user_id: string
    first_name: string
    last_name: string
    email: string
    phone?: string
    default_address_street?: string
    default_address_city?: string
    default_address_postcode?: string
    default_address_county?: string
    default_address_country?: string
    default_formatted_address?: string
    default_latitude?: number
    default_longitude?: number
    suspended_reason?: string
    admin_notes?: string
    created_at: string
    updated_at: string
    recent_service_requests?: AdminServiceRequestSummary[]
}

export interface AdminServiceRequestSummary {
    id: string
    consumer_id?: string
    provider_id?: string
    consumer_name?: string
    consumer_phone?: string
    consumer_email?: string
    service_category: ServiceCategory
    service_address?: string
    distance_km?: number
    status: string
    otp_verified: boolean
    expires_at?: string
    created_at: string
    responded_at?: string
    completed_at?: string
    providers?: { id?: string; business_name?: string; first_name?: string; last_name?: string }
}

export interface AdminActivityLogEntry {
    id: string
    admin_id: string | null
    admin_email: string
    action: string
    entity_type: 'provider' | 'consumer' | 'service_request'
    entity_id: string | null
    details: Record<string, unknown> | null
    created_at: string
}

// ============================================
// Database Types (Supabase)
// ============================================

export interface Database {
    public: {
        Tables: {
            providers: {
                Row: Provider
                Insert: Omit<Provider, 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Omit<Provider, 'id' | 'created_at' | 'updated_at'>>
            }
            consumers: {
                Row: Consumer
                Insert: Omit<Consumer, 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Omit<Consumer, 'id' | 'created_at' | 'updated_at'>>
            }
            bookings: {
                Row: Booking
                Insert: Omit<Booking, 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Omit<Booking, 'id' | 'created_at' | 'updated_at'>>
            }
        }
    }
}
