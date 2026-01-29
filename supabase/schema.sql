-- ============================================
-- MateWise Database Schema
-- Supabase PostgreSQL with PostGIS for geospatial queries
-- ============================================

-- Enable PostGIS extension for geospatial support
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- ENUM Types
-- ============================================

-- Service categories enum
CREATE TYPE service_category AS ENUM (
    'cleaning',
    'repairs',
    'moving',
    'gardening',
    'plumbing',
    'painting',
    'tutoring',
    'care',
    'electrical',
    'pets'
);

-- Provider status enum
CREATE TYPE provider_status AS ENUM (
    'pending',
    'verified',
    'active',
    'suspended',
    'inactive'
);

-- Verification status enum
CREATE TYPE verification_status AS ENUM (
    'pending',
    'verified',
    'rejected',
    'expired'
);

-- Booking status enum
CREATE TYPE booking_status AS ENUM (
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'disputed'
);

-- User role enum
CREATE TYPE user_role AS ENUM (
    'consumer',
    'provider',
    'admin'
);

-- ============================================
-- Users Table (extends Supabase auth.users)
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    role user_role NOT NULL DEFAULT 'consumer',
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Providers Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Personal info
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    business_name TEXT,
    description TEXT,
    
    -- Services
    primary_service service_category NOT NULL,
    additional_services service_category[] DEFAULT '{}',
    
    -- Location (stored as separate fields and PostGIS point)
    address_street TEXT NOT NULL,
    address_city TEXT NOT NULL,
    address_postcode TEXT NOT NULL,
    address_county TEXT,
    address_country TEXT NOT NULL DEFAULT 'United Kingdom',
    formatted_address TEXT,
    
    -- PostGIS geography point for geospatial queries
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    
    -- Also store lat/lng for easy access
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    
    -- Service radius in kilometers
    service_radius_km NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    
    -- Business details
    years_experience INTEGER,
    hourly_rate NUMERIC(10,2),
    minimum_charge NUMERIC(10,2),
    
    -- Verification & Trust
    status provider_status NOT NULL DEFAULT 'pending',
    verification_status verification_status NOT NULL DEFAULT 'pending',
    trust_score NUMERIC(3,2), -- 0.00 to 5.00
    rating_average NUMERIC(3,2), -- 0.00 to 5.00
    total_reviews INTEGER DEFAULT 0,
    total_jobs_completed INTEGER DEFAULT 0,
    
    -- Availability
    is_available BOOLEAN NOT NULL DEFAULT true,
    availability_hours JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT providers_user_id_key UNIQUE (user_id),
    CONSTRAINT providers_email_key UNIQUE (email),
    CONSTRAINT check_rating CHECK (rating_average >= 0 AND rating_average <= 5),
    CONSTRAINT check_trust_score CHECK (trust_score >= 0 AND trust_score <= 5),
    CONSTRAINT check_service_radius CHECK (service_radius_km > 0 AND service_radius_km <= 100)
);

-- ============================================
-- Consumers Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.consumers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Personal info
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    
    -- Default location
    default_address_street TEXT,
    default_address_city TEXT,
    default_address_postcode TEXT,
    default_address_county TEXT,
    default_address_country TEXT DEFAULT 'United Kingdom',
    default_formatted_address TEXT,
    
    -- PostGIS geography point for default location
    default_location GEOGRAPHY(POINT, 4326),
    default_latitude DOUBLE PRECISION,
    default_longitude DOUBLE PRECISION,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT consumers_user_id_key UNIQUE (user_id),
    CONSTRAINT consumers_email_key UNIQUE (email)
);

-- ============================================
-- Bookings Table (for future use)
-- ============================================

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_id UUID NOT NULL REFERENCES public.consumers(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    
    -- Service details
    service_category service_category NOT NULL,
    
    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    estimated_duration_hours NUMERIC(4,2) NOT NULL,
    
    -- Service location
    service_address_street TEXT NOT NULL,
    service_address_city TEXT NOT NULL,
    service_address_postcode TEXT NOT NULL,
    service_address_county TEXT,
    service_address_country TEXT NOT NULL DEFAULT 'United Kingdom',
    service_formatted_address TEXT,
    service_location GEOGRAPHY(POINT, 4326) NOT NULL,
    service_latitude DOUBLE PRECISION NOT NULL,
    service_longitude DOUBLE PRECISION NOT NULL,
    
    -- Pricing
    estimated_price NUMERIC(10,2),
    final_price NUMERIC(10,2),
    
    -- Status
    status booking_status NOT NULL DEFAULT 'pending',
    
    -- Notes
    consumer_notes TEXT,
    provider_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Service Requests Table (Real-time requests)
-- ============================================

-- Request status enum
CREATE TYPE request_status AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'expired'
);

CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parties involved
    consumer_id UUID NOT NULL,
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    
    -- Consumer info (stored for quick access)
    consumer_name TEXT NOT NULL,
    consumer_phone TEXT,
    consumer_email TEXT,
    
    -- Service details
    service_category service_category NOT NULL,
    
    -- Location (optional - may not be known at request time)
    service_latitude DOUBLE PRECISION,
    service_longitude DOUBLE PRECISION,
    service_address TEXT,
    distance_km DOUBLE PRECISION,
    
    -- Status
    status request_status NOT NULL DEFAULT 'pending',
    
    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 seconds'),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

-- Index for provider lookups (for real-time notifications)
CREATE INDEX IF NOT EXISTS idx_service_requests_provider 
    ON public.service_requests (provider_id, status);

-- Index for consumer lookups
CREATE INDEX IF NOT EXISTS idx_service_requests_consumer 
    ON public.service_requests (consumer_id, status);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_service_requests_expires 
    ON public.service_requests (expires_at) WHERE status = 'pending';

-- Enable realtime for service_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;

-- ============================================
-- Indexes for Performance
-- ============================================

-- Spatial index for provider locations (most important for nearby searches)
CREATE INDEX IF NOT EXISTS idx_providers_location 
    ON public.providers USING GIST (location);

-- Index for service category searches
CREATE INDEX IF NOT EXISTS idx_providers_primary_service 
    ON public.providers (primary_service);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_providers_status 
    ON public.providers (status);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_providers_service_status 
    ON public.providers (primary_service, status, is_available);

-- Index for consumer default location
CREATE INDEX IF NOT EXISTS idx_consumers_location 
    ON public.consumers USING GIST (default_location);

-- Index for booking lookups
CREATE INDEX IF NOT EXISTS idx_bookings_consumer 
    ON public.bookings (consumer_id);

CREATE INDEX IF NOT EXISTS idx_bookings_provider 
    ON public.bookings (provider_id);

CREATE INDEX IF NOT EXISTS idx_bookings_status 
    ON public.bookings (status);

-- ============================================
-- Functions
-- ============================================

-- Function to find nearby providers within a radius
CREATE OR REPLACE FUNCTION find_nearby_providers(
    search_lat DOUBLE PRECISION,
    search_lng DOUBLE PRECISION,
    radius_km NUMERIC DEFAULT 10,
    service_filter service_category DEFAULT NULL,
    min_rating_filter NUMERIC DEFAULT NULL,
    available_only BOOLEAN DEFAULT TRUE,
    result_limit INTEGER DEFAULT 50,
    result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    first_name TEXT,
    last_name TEXT,
    business_name TEXT,
    email TEXT,
    phone TEXT,
    description TEXT,
    primary_service service_category,
    additional_services service_category[],
    address_street TEXT,
    address_city TEXT,
    address_postcode TEXT,
    address_county TEXT,
    address_country TEXT,
    formatted_address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    service_radius_km NUMERIC,
    years_experience INTEGER,
    hourly_rate NUMERIC,
    minimum_charge NUMERIC,
    status provider_status,
    verification_status verification_status,
    trust_score NUMERIC,
    rating_average NUMERIC,
    total_reviews INTEGER,
    total_jobs_completed INTEGER,
    is_available BOOLEAN,
    availability_hours JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.first_name,
        p.last_name,
        p.business_name,
        p.email,
        p.phone,
        p.description,
        p.primary_service,
        p.additional_services,
        p.address_street,
        p.address_city,
        p.address_postcode,
        p.address_county,
        p.address_country,
        p.formatted_address,
        p.latitude,
        p.longitude,
        p.service_radius_km,
        p.years_experience,
        p.hourly_rate,
        p.minimum_charge,
        p.status,
        p.verification_status,
        p.trust_score,
        p.rating_average,
        p.total_reviews,
        p.total_jobs_completed,
        p.is_available,
        p.availability_hours,
        p.created_at,
        p.updated_at,
        -- Calculate distance in kilometers
        ST_Distance(
            p.location,
            ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography
        ) / 1000.0 AS distance_km
    FROM public.providers p
    WHERE 
        -- Status must be active, verified, or pending
        p.status IN ('active', 'verified', 'pending')
        -- Within search radius
        AND ST_DWithin(
            p.location,
            ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
            radius_km * 1000  -- Convert km to meters
        )
        -- Optional: Filter by service category
        AND (service_filter IS NULL OR p.primary_service = service_filter OR service_filter = ANY(p.additional_services))
        -- Optional: Filter by minimum rating
        AND (min_rating_filter IS NULL OR p.rating_average >= min_rating_filter)
        -- Optional: Filter by availability
        AND (NOT available_only OR p.is_available = TRUE)
    ORDER BY distance_km ASC
    LIMIT result_limit
    OFFSET result_offset;
END;
$$;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically set location from latitude/longitude
CREATE OR REPLACE FUNCTION update_provider_location()
RETURNS TRIGGER AS $$
BEGIN
    -- Create PostGIS point from latitude and longitude
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to manually update provider location (for RPC calls)
CREATE OR REPLACE FUNCTION update_provider_location(provider_id UUID, lat DOUBLE PRECISION, lng DOUBLE PRECISION)
RETURNS VOID AS $$
BEGIN
    UPDATE public.providers
    SET 
        latitude = lat,
        longitude = lng,
        location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    WHERE id = provider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Triggers
-- ============================================

-- Auto-set location from lat/lng for providers
CREATE TRIGGER set_provider_location
    BEFORE INSERT OR UPDATE ON public.providers
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_location();

-- Auto-update updated_at for providers
CREATE TRIGGER update_providers_updated_at
    BEFORE UPDATE ON public.providers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for consumers
CREATE TRIGGER update_consumers_updated_at
    BEFORE UPDATE ON public.consumers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for bookings
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Providers policies
CREATE POLICY "Anyone can view active providers" 
    ON public.providers FOR SELECT 
    USING (status IN ('active', 'verified'));

CREATE POLICY "Providers can view their own full profile" 
    ON public.providers FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Providers can update their own profile" 
    ON public.providers FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can register as provider" 
    ON public.providers FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Consumers policies
CREATE POLICY "Consumers can view their own profile" 
    ON public.consumers FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Consumers can update their own profile" 
    ON public.consumers FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can register as consumer" 
    ON public.consumers FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Bookings policies
CREATE POLICY "Users can view their own bookings" 
    ON public.bookings FOR SELECT 
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.consumers WHERE id = consumer_id
            UNION
            SELECT user_id FROM public.providers WHERE id = provider_id
        )
    );

CREATE POLICY "Consumers can create bookings" 
    ON public.bookings FOR INSERT 
    WITH CHECK (
        auth.uid() IN (SELECT user_id FROM public.consumers WHERE id = consumer_id)
    );

CREATE POLICY "Booking participants can update bookings" 
    ON public.bookings FOR UPDATE 
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.consumers WHERE id = consumer_id
            UNION
            SELECT user_id FROM public.providers WHERE id = provider_id
        )
    );

-- ============================================
-- Grant Permissions
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
