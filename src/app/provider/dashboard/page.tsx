'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { 
    User, 
    LogOut,
    Clock,
    Loader2,
    Bell,
    CheckCircle,
    XCircle
} from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'
import { useAuth } from '@/hooks/use-auth'

// Service request type
interface ServiceRequest {
    id: string
    consumer_id: string
    consumer_name: string
    service_category: string
    status: 'pending' | 'accepted' | 'rejected' | 'expired'
    created_at: string
    expires_at: string
}

export default function ProviderDashboard() {
    const router = useRouter()
    const { user, loading, role, signOut } = useAuth()
    const [providerData, setProviderData] = useState<{
        id?: string
        business_name?: string
        first_name?: string
        last_name?: string
        primary_service?: string
        status?: string
        rating_average?: number
        total_jobs_completed?: number
    } | null>(null)
    const [isLoadingProvider, setIsLoadingProvider] = useState(true)
    const [isSigningOut, setIsSigningOut] = useState(false)
    const [pendingRequests, setPendingRequests] = useState<ServiceRequest[]>([])
    const [processingRequest, setProcessingRequest] = useState<string | null>(null)

    // Redirect if not authenticated or not a provider
    useEffect(() => {
        if (!loading && !user) {
            router.replace('/provider/login')
        }
        if (!loading && user && role && role !== 'provider') {
            router.replace('/')
        }
    }, [user, loading, role, router])

    // Fetch provider data from database
    useEffect(() => {
        if (!user) return

        const fetchProviderData = async () => {
            setIsLoadingProvider(true)
            try {
                // Fetch provider record using auth user ID
                const response = await fetch(`/api/providers/${user.id}?byUserId=true`)
                const result = await response.json()

                if (result.success && result.data) {
                    setProviderData({
                        id: result.data.id, // This is the provider table ID, not auth user ID
                        first_name: result.data.first_name,
                        last_name: result.data.last_name,
                        business_name: result.data.business_name,
                        primary_service: result.data.primary_service,
                        status: result.data.status,
                        rating_average: result.data.rating_average,
                        total_jobs_completed: result.data.total_jobs_completed
                    })
                } else {
                    // Fallback to metadata if provider not found
                    setProviderData({
                        id: user.id,
                        first_name: user.user_metadata?.first_name,
                        last_name: user.user_metadata?.last_name,
                        status: 'pending'
                    })
                }
            } catch (err) {
                console.error('Failed to fetch provider data:', err)
                // Fallback to metadata
                setProviderData({
                    id: user.id,
                    first_name: user.user_metadata?.first_name,
                    last_name: user.user_metadata?.last_name,
                    status: 'pending'
                })
            } finally {
                setIsLoadingProvider(false)
            }
        }

        fetchProviderData()
    }, [user])

    // Subscribe to real-time service requests
    useEffect(() => {
        if (!providerData?.id || !supabase) return

        // Subscribe to service_requests table for this provider
        const channel = supabase
            .channel('provider-requests')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'service_requests',
                    filter: `provider_id=eq.${providerData.id}`
                },
                (payload: { new: ServiceRequest }) => {
                    const newRequest = payload.new
                    if (newRequest.status === 'pending') {
                        setPendingRequests(prev => [...prev, newRequest])
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'service_requests',
                    filter: `provider_id=eq.${providerData.id}`
                },
                (payload: { new: ServiceRequest }) => {
                    const updatedRequest = payload.new
                    if (updatedRequest.status !== 'pending') {
                        // Remove from pending if no longer pending
                        setPendingRequests(prev => 
                            prev.filter(r => r.id !== updatedRequest.id)
                        )
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [providerData?.id])

    // Handle accept/reject request
    const handleRequestResponse = useCallback(async (requestId: string, action: 'accept' | 'reject') => {
        setProcessingRequest(requestId)
        try {
            const response = await fetch(`/api/service-requests/${requestId}/respond`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            })

            const result = await response.json()

            if (!response.ok || !result.success) {
                console.error('Response error:', result.error)
                setProcessingRequest(null)
                return
            }

            // Remove from pending requests
            setPendingRequests(prev => prev.filter(r => r.id !== requestId))

            // If accepted, redirect to navigation page
            if (action === 'accept') {
                router.push(`/provider/navigate/${requestId}`)
            }
        } catch (err) {
            console.error('Failed to respond to request:', err)
        } finally {
            setProcessingRequest(null)
        }
    }, [router])

    const handleSignOut = async () => {
        setIsSigningOut(true)
        await signOut()
        router.push('/provider/login')
    }

    if (loading || isLoadingProvider || !user || (role && role !== 'provider')) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">
                            M
                        </div>
                        <span className="text-xl font-bold">MateWise</span>
                        <span className="text-sm text-slate-500 hidden sm:inline">Provider Dashboard</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={handleSignOut}
                            disabled={isSigningOut}
                        >
                            {isSigningOut ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <LogOut className="h-4 w-4 mr-2" />
                            )}
                            Sign Out
                        </Button>
                        <div className="h-8 w-8 bg-slate-200 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-slate-600" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        Welcome back{providerData?.first_name ? `, ${providerData.first_name}` : ''}!
                    </h1>
                    <p className="text-slate-500">
                        Manage your services, bookings, and profile from here.
                    </p>
                </div>

                {/* Status Banner */}
                {providerData?.status === 'pending' && (
                    <Card className="mb-8 border-amber-200 bg-amber-50">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                                    <Clock className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-amber-900 mb-1">
                                        Profile Under Review
                                    </h3>
                                    <p className="text-amber-700 text-sm">
                                        Your profile is being reviewed by our team. This usually takes 1-2 business days.
                                        Once approved, you&apos;ll start receiving job requests.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Incoming Service Requests */}
                {pendingRequests.length > 0 && (
                    <div className="mb-8 space-y-4">
                        <div className="flex items-center gap-2">
                            <Bell className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-bold text-slate-900">
                                Incoming Requests ({pendingRequests.length})
                            </h2>
                        </div>
                        
                        {pendingRequests.map(request => (
                            <ServiceRequestNotification
                                key={request.id}
                                request={request}
                                onAccept={() => handleRequestResponse(request.id, 'accept')}
                                onReject={() => handleRequestResponse(request.id, 'reject')}
                                isProcessing={processingRequest === request.id}
                            />
                        ))}
                    </div>
                )}

                {/* Empty State when no requests */}
                {pendingRequests.length === 0 && (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Bell className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="font-medium text-slate-900 mb-1">No Incoming Requests</h3>
                            <p className="text-sm text-slate-500">
                                New service requests from consumers will appear here in real-time.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    )
}

/**
 * Service Request Notification Component
 * Shows incoming request with countdown and accept/reject buttons
 */
function ServiceRequestNotification({
    request,
    onAccept,
    onReject,
    isProcessing
}: {
    request: ServiceRequest
    onAccept: () => void
    onReject: () => void
    isProcessing: boolean
}) {
    const [timeRemaining, setTimeRemaining] = useState(30)
    const [isExpired, setIsExpired] = useState(false)

    // Calculate initial time remaining
    useEffect(() => {
        const expiresAt = new Date(request.expires_at).getTime()
        const now = Date.now()
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000))
        setTimeRemaining(remaining)
        if (remaining === 0) {
            setIsExpired(true)
        }
    }, [request.expires_at])

    // Countdown timer
    useEffect(() => {
        if (isExpired) return

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    setIsExpired(true)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [isExpired])

    if (isExpired) {
        return null // Don't show expired requests
    }

    return (
        <Card className="border-blue-200 bg-blue-50 animate-in slide-in-from-right duration-300 overflow-hidden">
            <CardContent className="p-0">
                {/* Progress bar for time remaining */}
                <div className="h-1 bg-blue-100">
                    <div 
                        className="h-full bg-blue-500 transition-all duration-1000"
                        style={{ width: `${(timeRemaining / 30) * 100}%` }}
                    />
                </div>
                
                <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                                <Bell className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-blue-900 mb-1">
                                    New Service Request!
                                </h3>
                                <p className="text-blue-700 text-sm mb-2">
                                    <span className="font-medium">{request.consumer_name}</span> is requesting{' '}
                                    <span className="capitalize font-medium">{request.service_category.replace('_', ' ')}</span>
                                </p>
                                <div className="flex items-center gap-2 text-sm text-blue-600">
                                    <Clock className="h-4 w-4" />
                                    <span className="font-medium">{timeRemaining}s remaining to respond</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={onReject}
                                variant="outline"
                                className="border-red-200 text-red-700 hover:bg-red-50"
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Decline
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={onAccept}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Accept
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
