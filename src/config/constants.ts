/**
 * Application-wide constants
 */

export const APP_CONFIG = {
    name: 'MateWise',
    description: 'MateWise - Trust-first marketplace for local services',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    defaultSearchRadius: 10, // km
    maxSearchRadius: 100, // km
} as const

export const API_ROUTES = {
    // Health
    health: '/api/health',
    
    // Providers
    providersRegister: '/api/providers/register',
    providersNearby: '/api/providers/nearby',
    providerById: (id: string) => `/api/providers/${id}`,
    
    // Services (future)
    services: '/api/services',
} as const

export const APP_ROUTES = {
    home: '/',
    
    // Consumer routes
    consumerDashboard: '/consumer/dashboard',
    consumerServices: '/consumer/services',
    consumerServiceSearch: (service: string) => `/consumer/services?service=${service}`,
    
    // Provider routes
    providerRegister: '/provider/register',
    providerDashboard: '/provider/dashboard',
} as const

// Service categories with metadata
export const SERVICE_CATEGORIES = {
    cleaning: {
        id: 'cleaning',
        title: 'Cleaning',
        description: 'House cleaning, deep cleaning, and organization.',
    },
    repairs: {
        id: 'repairs',
        title: 'Repairs & Maintenance',
        description: 'General repairs, handyman services, and fixes.',
    },
    moving: {
        id: 'moving',
        title: 'Moving & Storage',
        description: 'Packing, heavy lifting, and furniture assembly.',
    },
    gardening: {
        id: 'gardening',
        title: 'Gardening',
        description: 'Lawn care, landscaping, and outdoor maintenance.',
    },
    plumbing: {
        id: 'plumbing',
        title: 'Plumbing',
        description: 'Leak fixes, pipe installation, and maintenance.',
    },
    painting: {
        id: 'painting',
        title: 'Painting',
        description: 'Interior and exterior painting services.',
    },
    electrical: {
        id: 'electrical',
        title: 'Electrical',
        description: 'Wiring, installations, and electrical repairs.',
    },
    tutoring: {
        id: 'tutoring',
        title: 'Tutoring',
        description: 'Academic help, language learning, and skills.',
    },
    care: {
        id: 'care',
        title: 'Personal Care',
        description: 'Elderly care, assistance, and support services.',
    },
    pets: {
        id: 'pets',
        title: 'Pet Services',
        description: 'Pet sitting, walking, and grooming services.',
    },
} as const

// UK default location (London)
export const DEFAULT_UK_LOCATION = {
    latitude: 51.5074,
    longitude: -0.1278,
    city: 'London',
} as const

// Issue report form (consumer describing the problem when requesting a
// service) -- shared between the request form and the API route that
// validates/uploads it, so the two never drift apart.
export const ISSUE_REPORT = {
    descriptionMinLength: 10,
    descriptionMaxLength: 1000,
    maxImages: 4,
    maxImageBytes: 5 * 1024 * 1024, // 5MB, matches the storage bucket's own limit
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
} as const
