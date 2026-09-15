'use client'

/**
 * Provider Navigation Page
 * Shows live map with route from provider's current location to consumer's location
 * Uses Google Maps Directions API for optimal routing (industry standard)
 */

import { useState, useEffect, useCallback, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api'
import {
    ChevronLeft,
    Navigation,
    MapPin,
    Clock,
    Phone,
    User,
    Loader2,
    AlertCircle,
    RefreshCw,
    Locate,
    Car,
    Footprints,
    CheckCircle,
    Shield,
    ChevronDown,
    ChevronUp,
    FileText
} from 'lucide-react'
import { Button, Card, CardContent, Input } from '@/components/ui'
import { GoogleMapsProvider } from '@/components/maps'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'

interface ServiceRequestDetails {
    id: string
    provider_id: string
    consumer_name: string
    consumer_phone?: string
    service_category: string
    service_latitude: number
    service_longitude: number
    service_address?: string
    distance_km?: number
    issue_description?: string
    issue_images?: string[]
    status: string
    otp_verified?: boolean
}

const mapContainerStyle = {
    width: '100%',
    height: '100%'
}

// Custom map styles for better visibility
const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    fullscreenControl: true,
    gestureHandling: 'greedy',
    styles: [
        {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
        }
    ]
}

export default function ProviderNavigatePage({
    params
}: {
    params: Promise<{ requestId: string }>
}) {
    const { requestId } = use(params)
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    
    // State
    const [request, setRequest] = useState<ServiceRequestDetails | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [providerLocation, setProviderLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [providerLiveLocation, setProviderLiveLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
    const [travelMode, setTravelMode] = useState<'DRIVING' | 'WALKING'>('DRIVING')
    const [routeInfo, setRouteInfo] = useState<{ duration: string; distance: string } | null>(null)
    const [isRecalculating, setIsRecalculating] = useState(false)
    const [jobCompleted, setJobCompleted] = useState(false)
    const [isCompleting, setIsCompleting] = useState(false)
    const [isMapLoaded, setIsMapLoaded] = useState(false)
    const [otpInput, setOtpInput] = useState('')
    const [otpVerifying, setOtpVerifying] = useState(false)
    const [otpError, setOtpError] = useState<string | null>(null)
    const [otpVerified, setOtpVerified] = useState(false)
    const [showIssueDetails, setShowIssueDetails] = useState(false)
    
    // Refs
    const mapRef = useRef<google.maps.Map | null>(null)
    const watchIdRef = useRef<number | null>(null)
    const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null)

    // Require a signed-in provider
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/provider/login')
        }
    }, [user, authLoading, router])

    // Fetch service request details
    useEffect(() => {
        if (!user) return

        const fetchRequest = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                const response = await fetch(`/api/service-requests?id=${requestId}`, {
                    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
                })
                const result = await response.json()

                if (result.success && result.data) {
                    if (result.data.status !== 'accepted') {
                        setError('This request is not active')
                        return
                    }
                    setRequest(result.data)
                    setOtpVerified(result.data.otp_verified || false)
                    // Fetch provider's registered location
                    const providerResponse = await fetch(`/api/providers/${result.data.provider_id}`)
                    const providerResult = await providerResponse.json()
                    
                    if (providerResult.success && providerResult.data) {
                        setProviderLocation({
                            lat: providerResult.data.location.latitude,
                            lng: providerResult.data.location.longitude
                        })
                    }
                } else {
                    setError('Request not found')
                }
            } catch (err) {
                console.error('Failed to fetch request:', err)
                setError('Failed to load request details')
            } finally {
                setIsLoading(false)
            }
        }

        fetchRequest()
    }, [requestId, user])

    // Get provider's current live location for tracking (optional)
    useEffect(() => {
        if (!navigator.geolocation) {
            return
        }

        // Get initial position
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setProviderLiveLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                })
            },
            (err) => {
                console.error('Geolocation error:', err)
                // Don't set error - live location is optional
            },
            { enableHighAccuracy: true }
        )

        // Watch position for live tracking
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                setProviderLiveLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                })
            },
            (err) => {
                console.error('Watch position error:', err)
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 5000 // Update every 5 seconds at most
            }
        )

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
            }
        }
    }, [])

    // Calculate route when locations are available
    const calculateRoute = useCallback(async () => {
        if (!providerLocation || !request?.service_latitude || !request?.service_longitude) {
            return
        }

        // Check if Google Maps API is loaded
        if (typeof google === 'undefined' || !google.maps) {
            console.log('Google Maps not loaded yet, waiting...')
            return
        }

        if (!directionsServiceRef.current) {
            directionsServiceRef.current = new google.maps.DirectionsService()
        }

        setIsRecalculating(true)

        try {
            const googleTravelMode = travelMode === 'DRIVING' 
                ? google.maps.TravelMode.DRIVING 
                : google.maps.TravelMode.WALKING

            const result = await directionsServiceRef.current.route({
                origin: providerLocation,
                destination: {
                    lat: request.service_latitude,
                    lng: request.service_longitude
                },
                travelMode: googleTravelMode,
                optimizeWaypoints: true,
                provideRouteAlternatives: false,
                // Request traffic-aware routing for driving
                drivingOptions: travelMode === 'DRIVING' ? {
                    departureTime: new Date(),
                    trafficModel: google.maps.TrafficModel.BEST_GUESS
                } : undefined
            })

            setDirections(result)

            // Extract route info
            if (result.routes[0]?.legs[0]) {
                const leg = result.routes[0].legs[0]
                setRouteInfo({
                    duration: leg.duration?.text || 'Unknown',
                    distance: leg.distance?.text || 'Unknown'
                })
            }
        } catch (err) {
            console.error('Directions error:', err)
            // Don't show error for route calculation failures, just retry
        } finally {
            setIsRecalculating(false)
        }
    }, [providerLocation, request, travelMode])

    // Calculate route when data is ready and map is loaded
    useEffect(() => {
        if (providerLocation && request && isMapLoaded) {
            calculateRoute()
        }
    }, [providerLocation, request, isMapLoaded, calculateRoute])

    // Handle map load
    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map
        setIsMapLoaded(true)
    }, [])

    // Recenter map on registered provider location
    const recenterMap = useCallback(() => {
        if (mapRef.current && providerLocation) {
            mapRef.current.panTo(providerLocation)
            mapRef.current.setZoom(15)
        }
    }, [providerLocation])

    // Mark job as completed
    const handleCompleteJob = async () => {
        if (!otpVerified) {
            setOtpError('Please verify OTP before marking complete')
            return
        }

        setIsCompleting(true)
        setOtpError(null)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                setOtpError('Your session has expired. Please log in again.')
                setIsCompleting(false)
                return
            }

            const response = await fetch(`/api/service-requests/${requestId}/complete`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${session.access_token}` }
            })
            const result = await response.json()

            if (!result.success) {
                setOtpError(result.error || 'Failed to mark job as complete')
                setIsCompleting(false)
                return
            }

            setJobCompleted(true)
            setTimeout(() => {
                router.push('/provider/dashboard')
            }, 2000)
        } catch (err) {
            console.error('Complete job error:', err)
            setOtpError('Failed to mark job as complete')
            setIsCompleting(false)
        }
    }

    // Verify OTP
    const handleVerifyOtp = async () => {
        if (!otpInput || otpInput.length !== 6) {
            setOtpError('Please enter a valid 6-digit OTP')
            return
        }

        setOtpVerifying(true)
        setOtpError(null)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                setOtpError('Your session has expired. Please log in again.')
                setOtpVerifying(false)
                return
            }

            const response = await fetch(`/api/service-requests/${requestId}/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ otp: otpInput })
            })

            const result = await response.json()

            if (result.success) {
                setOtpVerified(true)
                setOtpError(null)
            } else {
                setOtpError(result.error || 'Invalid OTP')
            }
        } catch (error) {
            console.error('OTP verification error:', error)
            setOtpError('Failed to verify OTP. Please try again.')
        } finally {
            setOtpVerifying(false)
        }
    }

    // Loading state
    if (isLoading || authLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600">Loading navigation...</p>
                </div>
            </div>
        )
    }

    // Error state
    if (error || !request) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <Card className="max-w-md w-full">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">
                            {error || 'Request not found'}
                        </h2>
                        <p className="text-slate-500 mb-6">
                            Unable to load navigation for this request.
                        </p>
                        <Link href="/provider/dashboard">
                            <Button className="w-full">Back to Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Job completed state
    if (jobCompleted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <Card className="max-w-md w-full">
                    <CardContent className="p-8 text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">
                            Job Completed!
                        </h2>
                        <p className="text-slate-500 mb-4">
                            Great work! Redirecting to dashboard...
                        </p>
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400 mx-auto" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    const destination = {
        lat: request.service_latitude,
        lng: request.service_longitude
    }

    return (
        <div className="h-screen flex flex-col bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-4 py-3 flex-shrink-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/provider/dashboard">
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">Navigate to Customer</h1>
                            <p className="text-sm text-slate-500 capitalize">
                                {request.service_category.replace('_', ' ')} Service
                            </p>
                        </div>
                    </div>
                    
                    {/* Travel Mode Toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                        <button
                            onClick={() => setTravelMode('DRIVING')}
                            className={`p-2 rounded-md transition-colors ${
                                travelMode === 'DRIVING'
                                    ? 'bg-white shadow-sm text-slate-900'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                            title="Driving"
                        >
                            <Car className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setTravelMode('WALKING')}
                            className={`p-2 rounded-md transition-colors ${
                                travelMode === 'WALKING'
                                    ? 'bg-white shadow-sm text-slate-900'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                            title="Walking"
                        >
                            <Footprints className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Map */}
            <div className="flex-1 relative">
                <GoogleMapsProvider>
                    <NavigationMap
                        providerLocation={providerLocation}
                        providerLiveLocation={providerLiveLocation}
                        destination={destination}
                        directions={directions}
                        onMapLoad={onMapLoad}
                        consumerName={request.consumer_name}
                    />
                </GoogleMapsProvider>

                {/* Recenter Button */}
                <button
                    onClick={recenterMap}
                    className="absolute top-4 right-4 bg-white shadow-lg rounded-full p-3 hover:bg-slate-50 transition-colors"
                    title="Recenter on my location"
                >
                    <Locate className="h-5 w-5 text-slate-700" />
                </button>

                {/* Route Info Card */}
                {routeInfo && (
                    <div className="absolute top-4 left-4 bg-white shadow-lg rounded-xl px-4 py-3">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-600" />
                                <span className="font-semibold text-slate-900">{routeInfo.duration}</span>
                            </div>
                            <div className="w-px h-4 bg-slate-200" />
                            <div className="flex items-center gap-2">
                                <Navigation className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-slate-600">{routeInfo.distance}</span>
                            </div>
                            {isRecalculating && (
                                <>
                                    <div className="w-px h-4 bg-slate-200" />
                                    <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Panel - Customer Info & Actions */}
            <div className="bg-white border-t border-slate-200 p-4 flex-shrink-0 safe-area-inset-bottom">
                <div className="max-w-lg mx-auto">
                    {/* Customer Info */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-slate-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">{request.consumer_name}</h3>
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {request.service_address || `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`}
                            </p>
                        </div>
                        
                        {/* Call Button */}
                        {request.consumer_phone && (
                            <a href={`tel:${request.consumer_phone}`}>
                                <Button variant="outline" size="icon" className="rounded-full">
                                    <Phone className="h-5 w-5" />
                                </Button>
                            </a>
                        )}
                    </div>

                    {/* Reported Issue - collapsed by default so it doesn't crowd the map */}
                    {(request.issue_description || (request.issue_images && request.issue_images.length > 0)) && (
                        <div className="mb-4">
                            <button
                                type="button"
                                onClick={() => setShowIssueDetails((prev) => !prev)}
                                className="w-full flex items-center justify-between gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 transition-colors"
                            >
                                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <FileText className="h-4 w-4 text-slate-500" />
                                    Reported issue
                                </span>
                                {showIssueDetails ? (
                                    <ChevronUp className="h-4 w-4 text-slate-400" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                )}
                            </button>

                            {showIssueDetails && (
                                <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                    {request.issue_description && (
                                        <p className="text-sm text-slate-700">{request.issue_description}</p>
                                    )}
                                    {request.issue_images && request.issue_images.length > 0 && (
                                        <div className="flex gap-2 overflow-x-auto">
                                            {request.issue_images.map((url, index) => (
                                                <a
                                                    key={url}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block h-20 w-20 rounded-lg overflow-hidden border border-slate-200 shrink-0 hover:opacity-90 transition-opacity"
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={url} alt={`Issue photo ${index + 1}`} className="h-full w-full object-cover" />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        {/* OTP Verification Section */}
                        {!otpVerified ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Shield className="h-5 w-5 text-blue-600" />
                                    <h3 className="font-semibold text-blue-900">Verify OTP to Start Service</h3>
                                </div>
                                <p className="text-sm text-blue-700 mb-3">
                                    Ask the customer for the 6-digit OTP to confirm your arrival
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        type="text"
                                        placeholder="Enter 6-digit OTP"
                                        value={otpInput}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                                            setOtpInput(value)
                                            setOtpError(null)
                                        }}
                                        maxLength={6}
                                        className="flex-1 text-center text-lg tracking-widest font-semibold"
                                        disabled={otpVerifying}
                                    />
                                    <Button
                                        onClick={handleVerifyOtp}
                                        disabled={otpVerifying || otpInput.length !== 6}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {otpVerifying ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            'Verify'
                                        )}
                                    </Button>
                                </div>
                                {otpError && (
                                    <p className="text-sm text-red-600 mt-2">{otpError}</p>
                                )}
                            </div>
                        ) : (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-green-800">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="font-semibold">OTP Verified Successfully!</span>
                                </div>
                                {otpError && (
                                    <p className="text-sm text-red-600 mt-2">{otpError}</p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    // Open in native maps app
                                    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=${travelMode.toLowerCase()}`
                                    window.open(url, '_blank')
                                }}
                            >
                                <Navigation className="h-4 w-4 mr-2" />
                                Open in Maps
                            </Button>
                            <Button
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={handleCompleteJob}
                                disabled={!otpVerified || isCompleting}
                            >
                                {isCompleting ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Mark Complete
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * Navigation Map Component
 * Separate component to use Google Maps hooks
 */
function NavigationMap({
    providerLocation,
    providerLiveLocation,
    destination,
    directions,
    onMapLoad,
    consumerName
}: {
    providerLocation: { lat: number; lng: number } | null
    providerLiveLocation: { lat: number; lng: number } | null
    destination: { lat: number; lng: number }
    directions: google.maps.DirectionsResult | null
    onMapLoad: (map: google.maps.Map) => void
    consumerName: string
}) {
    // Calculate center point between provider and destination
    const center = providerLocation
        ? {
            lat: (providerLocation.lat + destination.lat) / 2,
            lng: (providerLocation.lng + destination.lng) / 2
        }
        : destination

    return (
        <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={14}
            onLoad={onMapLoad}
            options={mapOptions}
        >
            {/* Provider's registered location marker (green - starting point) */}
            {providerLocation && (
                <Marker
                    position={providerLocation}
                    icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#10B981',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 3,
                        scale: 12
                    }}
                    title="Starting location (Registered Address)"
                    label={{
                        text: 'Start',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 'bold'
                    }}
                    zIndex={500}
                />
            )}

            {/* Provider's live location marker (blue - current position) */}
            {providerLiveLocation && (
                <Marker
                    position={providerLiveLocation}
                    icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#3B82F6',
                        fillOpacity: 0.8,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                        scale: 8
                    }}
                    title="Your current location"
                    zIndex={1000}
                />
            )}

            {/* Destination marker (red/consumer) */}
            {!directions && (
                <Marker
                    position={destination}
                    icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#EF4444',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 3,
                        scale: 12
                    }}
                    title={`Customer: ${consumerName}`}
                    label={{
                        text: consumerName,
                        color: '#1e293b',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    }}
                />
            )}

            {/* Directions route */}
            {directions && (
                <DirectionsRenderer
                    directions={directions}
                    options={{
                        suppressMarkers: false,
                        polylineOptions: {
                            strokeColor: '#3B82F6',
                            strokeWeight: 5,
                            strokeOpacity: 0.8
                        },
                        markerOptions: {
                            zIndex: 100
                        }
                    }}
                />
            )}
        </GoogleMap>
    )
}
