'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
    XCircle,
    History,
    MapPin,
    Navigation as NavigationIcon,
    ImageIcon
} from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'
import { useAuth } from '@/hooks/use-auth'

// Service request type
interface ServiceRequest {
    id: string
    consumer_id: string
    consumer_name: string
    service_category: string
    service_address?: string
    distance_km?: number
    issue_description?: string
    issue_images?: string[]
    status: 'pending' | 'accepted' | 'rejected' | 'expired'
    created_at: string
    expires_at: string
}

type RequestHistoryStatus = 'accepted' | 'rejected' | 'expired' | 'completed'

interface ServiceRequestHistoryItem {
    id: string
    consumer_name: string
    service_category: string
    service_address?: string
    distance_km?: number
    issue_description?: string
    issue_images?: string[]
    status: 'pending' | RequestHistoryStatus
    otp_verified: boolean
    created_at: string
    responded_at?: string
    completed_at?: string
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
    const [historyRequests, setHistoryRequests] = useState<(ServiceRequestHistoryItem & { status: RequestHistoryStatus })[]>([])
    const [isLoadingHistory, setIsLoadingHistory] = useState(true)

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

    // Fetch pending requests (issue description + signed photo URLs come
    // from the API, not the raw table -- see fetchHistory below for why
    // realtime alone can't serve those directly).
    const fetchPendingRequests = useCallback(async () => {
        if (!providerData?.id) return
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const response = await fetch('/api/service-requests?scope=provider&status=pending', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            })
            const result = await response.json()

            if (result.success && result.data) {
                setPendingRequests(result.data as ServiceRequest[])
            }
        } catch (err) {
            console.error('Failed to fetch pending requests:', err)
        }
    }, [providerData?.id])

    // Load whatever's already pending as soon as we know who this provider
    // is (covers a page refresh while a request is still waiting), then
    // keep it current.
    useEffect(() => {
        fetchPendingRequests()
    }, [fetchPendingRequests])

    // Realtime only tells us *that* something changed -- the row it pushes
    // is the raw table data (issue photos as private storage paths, not
    // viewable URLs), so on every insert/update we just refetch the
    // provider-scoped list above, which signs those paths into short-lived
    // URLs before they reach the client.
    useEffect(() => {
        if (!providerData?.id || !supabase) return

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
                () => fetchPendingRequests()
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'service_requests',
                    filter: `provider_id=eq.${providerData.id}`
                },
                () => fetchPendingRequests()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [providerData?.id, fetchPendingRequests])

    // Fetch job history (accepted/completed/rejected/expired requests)
    const fetchHistory = useCallback(async () => {
        if (!providerData?.id) return

        setIsLoadingHistory(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const response = await fetch('/api/service-requests?scope=provider', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            })
            const result = await response.json()

            if (result.success && result.data) {
                setHistoryRequests(
                    (result.data as ServiceRequestHistoryItem[]).filter(
                        (r): r is ServiceRequestHistoryItem & { status: RequestHistoryStatus } => r.status !== 'pending'
                    )
                )
            }
        } catch (err) {
            console.error('Failed to fetch job history:', err)
        } finally {
            setIsLoadingHistory(false)
        }
    }, [providerData?.id])

    useEffect(() => {
        fetchHistory()
    }, [fetchHistory])

    // Handle accept/reject request
    const handleRequestResponse = useCallback(async (requestId: string, action: 'accept' | 'reject') => {
        setProcessingRequest(requestId)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                console.error('No active session; cannot respond to request')
                setProcessingRequest(null)
                return
            }

            const response = await fetch(`/api/service-requests/${requestId}/respond`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                },
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
            } else {
                fetchHistory()
            }
        } catch (err) {
            console.error('Failed to respond to request:', err)
        } finally {
            setProcessingRequest(null)
        }
    }, [router, fetchHistory])

    // Only one incoming request is ever shown at a time -- the soonest to
    // expire -- as a focused popup rather than a stack of banners. Anything
    // else pending just waits its turn.
    const activeRequest = pendingRequests.length > 0
        ? [...pendingRequests].sort(
            (a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
        )[0]
        : null

    // The popup's own countdown hit zero client-side. The row is still
    // "pending" server-side until someone acts on it or it's re-fetched, but
    // there's no reason to keep showing it -- drop it locally so the next
    // queued request (if any) takes its place.
    const handleRequestExpire = useCallback((requestId: string) => {
        setPendingRequests(prev => prev.filter(r => r.id !== requestId))
    }, [])

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

                {/* Empty State when no requests */}
                {pendingRequests.length === 0 && (
                    <Card className="mb-8">
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

                {/* Job History */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-slate-600" />
                        <h2 className="text-xl font-bold text-slate-900">Job History</h2>
                    </div>

                    {isLoadingHistory ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : historyRequests.length === 0 ? (
                        <Card>
                            <CardContent className="p-10 text-center">
                                <p className="text-sm text-slate-500">
                                    Jobs you&apos;ve accepted, completed, or declined will show up here.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {historyRequests.map(item => (
                                <JobHistoryRow key={item.id} item={item} />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Incoming request popup -- one at a time, most urgent first */}
            {activeRequest && (
                <IncomingRequestModal
                    key={activeRequest.id}
                    request={activeRequest}
                    queueCount={pendingRequests.length}
                    onAccept={() => handleRequestResponse(activeRequest.id, 'accept')}
                    onReject={() => handleRequestResponse(activeRequest.id, 'reject')}
                    onExpire={() => handleRequestExpire(activeRequest.id)}
                    isProcessing={processingRequest === activeRequest.id}
                />
            )}
        </div>
    )
}

/**
 * Job History Row
 * One past/in-progress request: consumer, service, status, and a resume
 * link back into navigation if it's accepted but not yet completed.
 */
function JobHistoryRow({ item }: { item: ServiceRequestHistoryItem & { status: RequestHistoryStatus } }) {
    const statusStyles: Record<RequestHistoryStatus, string> = {
        completed: 'bg-green-100 text-green-800',
        accepted: 'bg-blue-100 text-blue-800',
        rejected: 'bg-red-100 text-red-800',
        expired: 'bg-slate-100 text-slate-600'
    }

    const statusLabels: Record<RequestHistoryStatus, string> = {
        completed: 'Completed',
        accepted: 'In Progress',
        rejected: 'Declined',
        expired: 'Expired'
    }

    const dateLabel = new Date(item.completed_at || item.responded_at || item.created_at)
        .toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    return (
        <Card>
            <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 truncate">{item.consumer_name}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusStyles[item.status]}`}>
                            {statusLabels[item.status]}
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 capitalize truncate">
                        {item.service_category.replace('_', ' ')}
                        {item.service_address ? ` · ${item.service_address}` : ''}
                    </p>
                    {item.issue_description && (
                        <p className="text-xs text-slate-500 mt-1 truncate">&ldquo;{item.issue_description}&rdquo;</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                        {dateLabel}
                        {item.issue_images && item.issue_images.length > 0 ? ` · ${item.issue_images.length} photo${item.issue_images.length === 1 ? '' : 's'}` : ''}
                    </p>
                </div>

                {item.status === 'accepted' && (
                    <Link href={`/provider/navigate/${item.id}`} className="flex-shrink-0">
                        <Button size="sm" variant="outline">
                            <NavigationIcon className="h-4 w-4 mr-1" />
                            Resume
                        </Button>
                    </Link>
                )}
            </CardContent>
        </Card>
    )
}

/**
 * Incoming Request Popup
 * A focused modal takeover for a new service request -- one at a time, most
 * urgent first (see `activeRequest` in ProviderDashboard) -- with a live
 * countdown ring, what the consumer is facing, and accept/decline.
 */
function IncomingRequestModal({
    request,
    queueCount,
    onAccept,
    onReject,
    onExpire,
    isProcessing
}: {
    request: ServiceRequest
    queueCount: number
    onAccept: () => void
    onReject: () => void
    onExpire: () => void
    isProcessing: boolean
}) {
    const TIMEOUT_SECONDS = 30
    const RING_RADIUS = 34
    const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

    const secondsLeft = () => Math.max(0, Math.floor((new Date(request.expires_at).getTime() - Date.now()) / 1000))
    const [timeRemaining, setTimeRemaining] = useState(secondsLeft)
    const hasExpiredRef = useRef(false)

    // A different (more urgent) request can take over this same popup --
    // reset the clock and the one-shot expiry guard whenever that happens.
    useEffect(() => {
        hasExpiredRef.current = false
        setTimeRemaining(secondsLeft())
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request.id])

    const isExpired = timeRemaining <= 0

    // Countdown timer
    useEffect(() => {
        if (isExpired) return
        const timer = setInterval(() => {
            setTimeRemaining(prev => Math.max(0, prev - 1))
        }, 1000)
        return () => clearInterval(timer)
    }, [isExpired])

    // Hand it back to the parent once the clock runs out, so the next
    // queued request (if any) can take over. Guarded so it only fires once
    // per request and never while a response is already in flight.
    useEffect(() => {
        if (!isExpired || isProcessing || hasExpiredRef.current) return
        hasExpiredRef.current = true
        onExpire()
    }, [isExpired, isProcessing, onExpire])

    if (isExpired) return null

    const urgency: 'normal' | 'warning' | 'critical' =
        timeRemaining <= 5 ? 'critical' : timeRemaining <= 15 ? 'warning' : 'normal'

    const ringColor = { normal: '#2563eb', warning: '#d97706', critical: '#dc2626' }[urgency]
    const ringTrack = { normal: '#dbeafe', warning: '#fef3c7', critical: '#fee2e2' }[urgency]
    const timeTextColor = { normal: 'text-blue-600', warning: 'text-amber-600', critical: 'text-red-600' }[urgency]

    const initials = request.consumer_name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0]?.toUpperCase())
        .join('') || '?'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto">
                <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
                            </span>
                            <span className="text-xs font-semibold tracking-wide text-blue-600 uppercase">New Request</span>
                        </div>
                        {queueCount > 1 && (
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                +{queueCount - 1} waiting
                            </span>
                        )}
                    </div>

                    {/* Countdown ring + consumer */}
                    <div className="flex items-center gap-4 mb-5">
                        <div className="relative h-20 w-20 shrink-0">
                            <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
                                <circle cx="40" cy="40" r={RING_RADIUS} stroke={ringTrack} strokeWidth="6" fill="none" />
                                <circle
                                    cx="40"
                                    cy="40"
                                    r={RING_RADIUS}
                                    stroke={ringColor}
                                    strokeWidth="6"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeDasharray={RING_CIRCUMFERENCE}
                                    strokeDashoffset={RING_CIRCUMFERENCE * (1 - timeRemaining / TIMEOUT_SECONDS)}
                                    className="transition-all duration-1000 ease-linear"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-xl font-bold tabular-nums ${timeTextColor} ${urgency === 'critical' ? 'animate-pulse' : ''}`}>
                                    {timeRemaining}
                                </span>
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                                    {initials}
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg truncate">{request.consumer_name}</h3>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium capitalize bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                                    {request.service_category.replace('_', ' ')}
                                </span>
                                {typeof request.distance_km === 'number' && (
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {request.distance_km.toFixed(1)} km away
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* What the consumer is actually facing */}
                    {(request.issue_description || (request.issue_images && request.issue_images.length > 0)) && (
                        <div className="mb-5 space-y-2">
                            {request.issue_description && (
                                <p className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">
                                    {request.issue_description}
                                </p>
                            )}
                            {request.issue_images && request.issue_images.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {request.issue_images.map((url, index) => (
                                        <a
                                            key={url}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="relative block h-16 w-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 group"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={url} alt={`Issue photo ${index + 1}`} className="h-full w-full object-cover" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {request.service_address && (
                        <div className="flex items-start gap-2 text-sm text-slate-500 mb-5">
                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{request.service_address}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            onClick={onReject}
                            variant="outline"
                            size="lg"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl"
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <XCircle className="h-4 w-4 mr-1.5" />
                                    Decline
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={onAccept}
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-1.5" />
                                    Accept
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
