'use client'

/**
 * Service Providers Map Component
 * Shows nearby service providers on a Google Map for consumers
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { GoogleMap, Marker } from '@react-google-maps/api'
import { Card, CardContent } from '@/components/ui'
import {
    MapPin,
    Star,
    Clock,
    Phone,
    ChevronRight,
    Navigation,
    Filter
} from 'lucide-react'
import { ProviderDetailCardOverlay } from '@/components/maps/provider-detail-card-overlay'
import type { ProviderSearchResult, GeoLocation, ServiceCategory } from '@/types'

interface ProvidersMapProps {
    providers: ProviderSearchResult[]
    center: GeoLocation
    onProviderSelect?: (provider: ProviderSearchResult) => void
    onRequestService?: (provider: ProviderSearchResult) => void
    selectedService?: ServiceCategory
    isLoading?: boolean
    className?: string
}

const mapContainerStyle = {
    width: '100%',
    height: '500px',
    borderRadius: '1rem'
}

// Service category colors for markers
const SERVICE_COLORS: Record<ServiceCategory, string> = {
    cleaning: '#10B981', // green
    repairs: '#F59E0B', // amber
    moving: '#6366F1', // indigo
    gardening: '#22C55E', // lime
    plumbing: '#3B82F6', // blue
    painting: '#EC4899', // pink
    tutoring: '#8B5CF6', // purple
    care: '#F43F5E', // rose
    electrical: '#EAB308', // yellow
    pets: '#14B8A6' // teal
}

export function ProvidersMap({
    providers,
    center,
    onProviderSelect,
    onRequestService,
    selectedService,
    isLoading = false,
    className = ''
}: ProvidersMapProps) {
    const [map, setMap] = useState<google.maps.Map | null>(null)
    const [selectedProvider, setSelectedProvider] = useState<ProviderSearchResult | null>(null)
    const previousProvidersRef = useRef<string>('')

    // Only pass center on first render, then let map handle its own state
    const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number } | undefined>({
        lat: center.latitude,
        lng: center.longitude
    })

    // Handle map load and clear controlled center
    const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance)
        // After map loads, stop controlling center
        setMapCenter(undefined)
    }, [])

    // Fit bounds to show all providers - only when providers list actually changes
    useEffect(() => {
        if (!map || providers.length === 0) return

        // Create a unique key for the current providers
        const providersKey = providers.map(p => p.id).sort().join(',')

        // Only fit bounds if providers actually changed
        if (providersKey !== previousProvidersRef.current) {
            const bounds = new google.maps.LatLngBounds()

            // Include center point
            bounds.extend({ lat: center.latitude, lng: center.longitude })

            // Include all providers
            providers.forEach(provider => {
                bounds.extend({
                    lat: provider.location.latitude,
                    lng: provider.location.longitude
                })
            })

            map.fitBounds(bounds)
            previousProvidersRef.current = providersKey
        }
    }, [map, providers, center])

    // Handle marker click - just set selection, no map movement
    const handleMarkerClick = useCallback((provider: ProviderSearchResult) => {
        setSelectedProvider(provider)
    }, [])

    // Handle info window close
    const handleInfoWindowClose = useCallback(() => {
        setSelectedProvider(null)
    }, [])

    // Handle request service
    const handleRequestService = useCallback(() => {
        if (selectedProvider && onRequestService) {
            onRequestService(selectedProvider)
        }
    }, [selectedProvider, onRequestService])

    // Memoize markers to prevent unnecessary re-renders
    const markers = useMemo(() => {
        return providers.map(provider => ({
            id: provider.id,
            position: {
                lat: provider.location.latitude,
                lng: provider.location.longitude
            },
            provider
        }))
    }, [providers])

    return (
        <div className={`relative ${className}`}>
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={mapCenter}
                    zoom={13}
                    onLoad={onMapLoad}
                    options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: true,
                        zoomControl: true,
                        gestureHandling: 'greedy',
                        styles: [
                            {
                                featureType: 'poi',
                                elementType: 'labels',
                                stylers: [{ visibility: 'off' }]
                            },
                            {
                                featureType: 'transit',
                                stylers: [{ visibility: 'off' }]
                            }
                        ]
                    }}
                >
                    {/* User's location marker */}
                    <Marker
                        position={{ lat: center.latitude, lng: center.longitude }}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: '#000000',
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 3,
                            scale: 10
                        }}
                        title="Your location"
                        zIndex={1000}
                    />

                    {/* Provider markers */}
                    {markers.map(({ id, position, provider }) => {
                        const color = SERVICE_COLORS[provider.primary_service] || '#000000'
                        const isSelected = selectedProvider?.id === id
                        const businessName = provider.business_name || `${provider.first_name} ${provider.last_name}`
                        return (
                            <Marker
                                key={id}
                                position={position}
                                icon={{
                                    path: google.maps.SymbolPath.CIRCLE,
                                    fillColor: color,
                                    fillOpacity: 0.9,
                                    strokeColor: '#ffffff',
                                    strokeWeight: isSelected ? 3 : 2,
                                    scale: isSelected ? 14 : 12
                                }}
                                label={{
                                    text: businessName,
                                    color: '#1e293b',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    className: 'marker-label'
                                }}
                                onClick={() => handleMarkerClick(provider)}
                                title={businessName}
                            />
                        )
                    })}

                </GoogleMap>

                {/* Provider Detail Overlay */}
                {selectedProvider && (
                    <ProviderDetailCardOverlay
                        provider={selectedProvider}
                        onClose={() => setSelectedProvider(null)}
                        onRequestService={handleRequestService}
                    />
                )}
            </div>

            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-2xl">
                    <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
                        <p className="text-sm text-slate-600">Finding providers...</p>
                    </div>
                </div>
            )}

            {/* No providers message */}
            {!isLoading && providers.length === 0 && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-2xl">
                    <div className="text-center p-6">
                        <Filter className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                        <p className="font-medium text-slate-900">No providers found</p>
                        <p className="text-sm text-slate-500 mt-1">
                            Try expanding your search radius or selecting a different service
                        </p>
                    </div>
                </div>
            )}

            {/* Providers count badge */}
            {providers.length > 0 && (
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-900">
                        {providers.length} provider{providers.length !== 1 ? 's' : ''} nearby
                    </p>
                </div>
            )}
        </div>
    )
}

/**
 * Provider Card Component for the list view
 */
export function ProviderCard({
    provider,
    onSelect,
    isSelected = false
}: {
    provider: ProviderSearchResult
    onSelect?: (provider: ProviderSearchResult) => void
    isSelected?: boolean
}) {
    return (
        <Card
            className={`cursor-pointer transition-all duration-200 ${isSelected
                ? 'border-black shadow-lg'
                : 'hover:border-slate-300 hover:shadow-md'
                }`}
            onClick={() => onSelect?.(provider)}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 truncate">
                                {provider.business_name ||
                                    `${provider.first_name} ${provider.last_name}`}
                            </h3>
                            {provider.verification_status === 'verified' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    Verified
                                </span>
                            )}
                        </div>

                        <p className="text-sm text-slate-500 capitalize mb-2">
                            {provider.primary_service.replace('_', ' ')}
                        </p>

                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-slate-600">
                                <Navigation className="h-3.5 w-3.5" />
                                <span>{provider.distance_km.toFixed(1)} km</span>
                            </div>

                            {provider.rating_average && (
                                <div className="flex items-center gap-1">
                                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                    <span className="font-medium">{provider.rating_average.toFixed(1)}</span>
                                    {(provider.total_reviews ?? 0) > 0 && (
                                        <span className="text-slate-400">({provider.total_reviews})</span>
                                    )}
                                </div>
                            )}

                            {provider.hourly_rate && (
                                <span className="text-slate-600">
                                    £{provider.hourly_rate}/hr
                                </span>
                            )}
                        </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                </div>
            </CardContent>
        </Card>
    )
}
