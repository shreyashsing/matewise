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
