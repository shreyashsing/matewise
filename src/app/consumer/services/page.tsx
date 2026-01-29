'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
    ChevronLeft,
    MapPin,
    Search,
    Filter,
    List,
    Map,
    Loader2,
    Crosshair,
    SlidersHorizontal,
    SprayCan,
    Wrench,
    Truck,
    Leaf,
    Zap,
    PaintBucket,
    Book,
    Heart,
    Dog,
    Lightbulb,
    ArrowRight
} from 'lucide-react'
import { Button, Card, CardContent, Input, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { GoogleMapsProvider, ProvidersMap, ProviderCard } from '@/components/maps'
import { ServiceRequestModal } from '@/components/service-request'
import type { ProviderSearchResult, GeoLocation, ServiceCategory } from '@/types'

// Service category labels with icons
const SERVICE_CONFIG: Record<ServiceCategory, { title: string; description: string; icon: any }> = {
    cleaning: {
        title: 'Cleaning',
        description: 'House cleaning, deep cleaning, and organization.',
        icon: SprayCan
    },
    repairs: {
        title: 'Repairs & Maintenance',
        description: 'General repairs, handyman services, and fixes.',
        icon: Wrench
    },
    moving: {
        title: 'Moving & Storage',
        description: 'Packing, heavy lifting, and furniture assembly.',
        icon: Truck
    },
    gardening: {
        title: 'Gardening',
        description: 'Lawn care, landscaping, and outdoor maintenance.',
        icon: Leaf
    },
    plumbing: {
        title: 'Plumbing',
        description: 'Leak fixes, pipe installation, and maintenance.',
        icon: Zap
    },
    painting: {
        title: 'Painting',
        description: 'Interior and exterior painting services.',
        icon: PaintBucket
    },
    electrical: {
        title: 'Electrical',
        description: 'Wiring, installations, and electrical repairs.',
        icon: Lightbulb
    },
    tutoring: {
        title: 'Tutoring',
        description: 'Academic help, language learning, and skills.',
        icon: Book
    },
    care: {
        title: 'Personal Care',
        description: 'Elderly care, assistance, and support services.',
        icon: Heart
    },
    pets: {
        title: 'Pet Services',
        description: 'Pet sitting, walking, and grooming services.',
        icon: Dog
    }
}

// Default location (New Delhi, India)
const DEFAULT_LOCATION: GeoLocation = {
    latitude: 28.6139,
    longitude: 77.2090
}

// Loading fallback component
function LoadingState() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">Loading services...</p>
            </div>
        </div>
    )
}

// Main content component that uses searchParams
function ServiceSearchContent() {
    const searchParams = useSearchParams()
    const serviceParam = searchParams.get('service') as ServiceCategory | null

    // State
    const [providers, setProviders] = useState<ProviderSearchResult[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [userLocation, setUserLocation] = useState<GeoLocation | null>(null)
    const [selectedProvider, setSelectedProvider] = useState<ProviderSearchResult | null>(null)
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
    const [requestingProvider, setRequestingProvider] = useState<ProviderSearchResult | null>(null)
    
    // Filters
    const [selectedService, setSelectedService] = useState<ServiceCategory | null>(serviceParam)
    const [searchRadius, setSearchRadius] = useState(10)
    const [showFilters, setShowFilters] = useState(false)

    // Get user's current location
    const getUserLocation = useCallback(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    })
                },
                (error) => {
                    console.error('Geolocation error:', error)
                    // Use default location
                    setUserLocation(DEFAULT_LOCATION)
                },
                { enableHighAccuracy: true }
            )
        } else {
            setUserLocation(DEFAULT_LOCATION)
        }
    }, [])

    // Fetch nearby providers
    const fetchProviders = useCallback(async () => {
        if (!userLocation) return

        setIsLoading(true)
        setError(null)

        try {
            const params = new URLSearchParams({
                lat: userLocation.latitude.toString(),
                lng: userLocation.longitude.toString(),
                radius: searchRadius.toString(),
                limit: '50'
            })

            if (selectedService) {
                params.append('service', selectedService)
            }

            const response = await fetch(`/api/providers/nearby?${params}`)
            const result = await response.json()

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to fetch providers')
            }

            setProviders(result.data || [])
        } catch (err) {
            console.error('Fetch error:', err)
            setError(err instanceof Error ? err.message : 'Failed to load providers')
        } finally {
            setIsLoading(false)
        }
    }, [userLocation, selectedService, searchRadius])

    // Get location on mount
    useEffect(() => {
        getUserLocation()
    }, [getUserLocation])

    // Fetch providers when location or filters change
    useEffect(() => {
        if (userLocation) {
            fetchProviders()
        }
    }, [userLocation, fetchProviders])

    // Handle provider selection
    const handleProviderSelect = (provider: ProviderSearchResult) => {
        setSelectedProvider(provider)
        // Could navigate to provider detail page
        // router.push(`/consumer/provider/${provider.id}`)
    }

    // Handle service request
    const handleRequestService = (provider: ProviderSearchResult) => {
        setRequestingProvider(provider)
    }

    // Handle service filter change
    const handleServiceChange = (service: ServiceCategory | null) => {
        setSelectedService(service)
    }

    // If no service selected, show service selection page
    if (!selectedService && !serviceParam) {
        return (
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="px-6 py-6 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <span className="text-xl font-bold tracking-tight">MateWise</span>
                    </div>
                    <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-lg">M</div>
                </header>

                <main className="p-6 md:p-12 max-w-7xl mx-auto animate-in fade-in duration-700 slide-in-from-bottom-4">
                    {/* Hero / Intro */}
                    <div className="mb-10 text-center md:text-left space-y-4">
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900">
                            Find a Service
                        </h1>
                        <p className="text-slate-500 text-lg md:text-xl max-w-2xl">
                            Choose a category below to connect with trusted professionals in your area.
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative max-w-xl mb-12">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-11 pr-4 py-4 border border-slate-200 rounded-2xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black sm:text-base transition-all shadow-sm hover:shadow-md"
                            placeholder="What service are you looking for?"
                        />
                    </div>

                    {/* Services Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(SERVICE_CONFIG).map(([id, service]) => {
                            const Icon = service.icon
                            return (
                                <div 
                                    key={id} 
                                    onClick={() => setSelectedService(id as ServiceCategory)}
                                    className="cursor-pointer"
                                >
                                    <Card className="group relative overflow-hidden border-transparent hover:border-black/10 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white h-full">
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                            <ArrowRight className="h-5 w-5 text-slate-900" />
                                        </div>
                                        <CardHeader className="pb-2">
                                            <div className="h-14 w-14 rounded-2xl bg-slate-50 group-hover:bg-black group-hover:text-white transition-colors duration-300 flex items-center justify-center mb-4">
                                                <Icon className="h-7 w-7" />
                                            </div>
                                            <CardTitle className="text-xl font-bold tracking-tight">
                                                {service.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <CardDescription className="text-base text-slate-500 group-hover:text-slate-600 transition-colors">
                                                {service.description}
                                            </CardDescription>
                                        </CardContent>
                                        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none" />
                                    </Card>
                                </div>
                            )
                        })}
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="px-4 py-4 bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">
                                {selectedService ? SERVICE_CONFIG[selectedService].title : 'All Services'}
                            </h1>
                            <p className="text-sm text-slate-500">
                                {providers.length} provider{providers.length !== 1 ? 's' : ''} nearby
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View toggle */}
                        <div className="hidden sm:flex bg-slate-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('map')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    viewMode === 'map' 
                                        ? 'bg-white text-slate-900 shadow-sm' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Map className="h-4 w-4 inline-block mr-1" />
                                Map
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    viewMode === 'list' 
                                        ? 'bg-white text-slate-900 shadow-sm' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <List className="h-4 w-4 inline-block mr-1" />
                                List
                            </button>
                        </div>

                        {/* Filters button */}
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <SlidersHorizontal className="h-4 w-4 mr-1" />
                            Filters
                        </Button>
                    </div>
                </div>

                {/* Filters panel */}
                {showFilters && (
                    <div className="max-w-7xl mx-auto mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Service filter */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Service Type
                                </label>
                                <select
                                    value={selectedService || ''}
                                    onChange={(e) => handleServiceChange(e.target.value as ServiceCategory || null)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black"
                                >
                                    <option value="">All Services</option>
                                    {Object.entries(SERVICE_CONFIG).map(([key, service]) => (
                                        <option key={key} value={key}>{service.title}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Radius filter */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Search Radius: {searchRadius}km
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="50"
                                    value={searchRadius}
                                    onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                                    className="w-full"
                                />
                            </div>

                            {/* Update location */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Location
                                </label>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full"
                                    onClick={getUserLocation}
                                >
                                    <Crosshair className="h-4 w-4 mr-2" />
                                    Use Current Location
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-4">
                {/* Error State */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                        <button 
                            onClick={fetchProviders}
                            className="ml-2 underline hover:no-underline"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Loading State - Initial */}
                {!userLocation && (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
                            <p className="text-slate-600">Getting your location...</p>
                        </div>
                    </div>
                )}

                {/* Content */}
                {userLocation && (
                    <div className={`grid gap-6 ${viewMode === 'map' ? 'lg:grid-cols-3' : ''}`}>
                        {/* Map View */}
                        {viewMode === 'map' && (
                            <div className="lg:col-span-2">
                                <GoogleMapsProvider>
                                    <ProvidersMap
                                        providers={providers}
                                        center={userLocation}
                                        onProviderSelect={handleProviderSelect}
                                        onRequestService={handleRequestService}
                                        selectedService={selectedService || undefined}
                                        isLoading={isLoading}
                                    />
                                </GoogleMapsProvider>
                            </div>
                        )}

                        {/* Provider List */}
                        <div className={viewMode === 'list' ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                            {isLoading ? (
                                // Loading skeleton
                                Array.from({ length: 5 }).map((_, i) => (
                                    <Card key={i} className="animate-pulse">
                                        <CardContent className="p-4">
                                            <div className="h-5 bg-slate-200 rounded w-2/3 mb-2" />
                                            <div className="h-4 bg-slate-200 rounded w-1/2 mb-3" />
                                            <div className="h-3 bg-slate-200 rounded w-full" />
                                        </CardContent>
                                    </Card>
                                ))
                            ) : providers.length === 0 ? (
                                <div className="col-span-full text-center py-10">
                                    <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                    <h3 className="font-medium text-slate-900 mb-1">No providers found</h3>
                                    <p className="text-sm text-slate-500">
                                        Try expanding your search radius or selecting a different service.
                                    </p>
                                </div>
                            ) : (
                                providers.map(provider => (
                                    <ProviderCard
                                        key={provider.id}
                                        provider={provider}
                                        onSelect={handleProviderSelect}
                                        isSelected={selectedProvider?.id === provider.id}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Mobile view toggle */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:hidden z-40">
                <div className="bg-white rounded-full shadow-lg border border-slate-200 p-1 flex">
                    <button
                        onClick={() => setViewMode('map')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            viewMode === 'map' 
                                ? 'bg-black text-white' 
                                : 'text-slate-600'
                        }`}
                    >
                        <Map className="h-4 w-4 inline-block mr-1" />
                        Map
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            viewMode === 'list' 
                                ? 'bg-black text-white' 
                                : 'text-slate-600'
                        }`}
                    >
                        <List className="h-4 w-4 inline-block mr-1" />
                        List
                    </button>
                </div>
            </div>

            {/* Selected Provider Detail Panel (for mobile) */}
            {selectedProvider && viewMode === 'map' && (
                <div className="fixed bottom-20 left-4 right-4 sm:hidden z-30 animate-in slide-in-from-bottom-4 duration-200">
                    <Card className="shadow-xl border-slate-200">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-semibold text-slate-900">
                                        {selectedProvider.business_name || 
                                            `${selectedProvider.first_name} ${selectedProvider.last_name}`}
                                    </h3>
                                    <p className="text-sm text-slate-500 capitalize">
                                        {selectedProvider.primary_service.replace('_', ' ')}
                                    </p>
                                    <p className="text-sm text-slate-600 mt-1">
                                        {selectedProvider.distance_km.toFixed(1)} km away
                                        {selectedProvider.hourly_rate && ` • £${selectedProvider.hourly_rate}/hr`}
                                    </p>
                                </div>
                                <Button size="sm" onClick={() => handleRequestService(selectedProvider)}>
                                    Request
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Service Request Modal */}
            {requestingProvider && selectedService && userLocation && (
                <ServiceRequestModal
                    provider={requestingProvider}
                    serviceCategory={selectedService}
                    consumerName="Guest User"
                    consumerLocation={userLocation}
                    onClose={() => setRequestingProvider(null)}
                />
            )}
        </div>
    )
}

// Main page component with Suspense boundary
export default function ServiceSearchPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <ServiceSearchContent />
        </Suspense>
    )
}
