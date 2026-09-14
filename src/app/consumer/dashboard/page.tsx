'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Search,
    Loader2,
    LogOut,
    User,
    Briefcase,
    ChevronRight
} from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'

type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'completed'

interface ConsumerRequestHistoryItem {
    id: string
    service_category: string
    service_address?: string
    status: RequestStatus
    otp_verified: boolean
    created_at: string
    completed_at?: string
    providers?: {
        business_name?: string
        first_name?: string
        last_name?: string
        primary_service?: string
        hourly_rate?: number
        phone?: string
    }
}

const STATUS_STYLES: Record<RequestStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    accepted: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-slate-100 text-slate-600'
}

const STATUS_LABELS: Record<RequestStatus, string> = {
    pending: 'Waiting for response',
    accepted: 'Accepted',
    completed: 'Completed',
    rejected: 'Declined',
    expired: 'Expired'
}

export default function ConsumerDashboard() {
    const router = useRouter()
    const { user, role, loading: authLoading, signOut } = useAuth()

    const [requests, setRequests] = useState<ConsumerRequestHistoryItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSigningOut, setIsSigningOut] = useState(false)

    // Require a signed-in consumer
    useEffect(() => {
        if (authLoading) return
        if (!user) {
            router.replace('/consumer/login?redirect=/consumer/dashboard')
            return
        }
        if (role && role !== 'consumer') {
            router.replace('/')
        }
    }, [user, role, authLoading, router])

    const fetchHistory = useCallback(async () => {
        if (!user) return

        setIsLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const response = await fetch('/api/service-requests?scope=consumer', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            })
            const result = await response.json()

            if (result.success && result.data) {
                setRequests(result.data as ConsumerRequestHistoryItem[])
            }
        } catch (err) {
            console.error('Failed to fetch booking history:', err)
        } finally {
            setIsLoading(false)
        }
    }, [user])

    useEffect(() => {
        fetchHistory()
    }, [fetchHistory])

    const handleSignOut = async () => {
        setIsSigningOut(true)
        await signOut()
        router.push('/')
    }

    if (authLoading || !user || (role && role !== 'consumer')) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    const providerLabel = (p?: ConsumerRequestHistoryItem['providers']) =>
        p?.business_name || (p?.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : 'Service Provider')

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">
                            M
                        </div>
                        <span className="text-xl font-bold">MateWise</span>
                        <span className="text-sm text-slate-500 hidden sm:inline">My Bookings</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={handleSignOut} disabled={isSigningOut}>
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
            <main className="max-w-5xl mx-auto px-6 py-8">
                <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">
                            Welcome back{user.user_metadata?.first_name ? `, ${user.user_metadata.first_name}` : ''}!
                        </h1>
                        <p className="text-slate-500">Your service requests and bookings, all in one place.</p>
                    </div>
                    <Link href="/consumer/services">
                        <Button>
                            <Search className="h-4 w-4 mr-2" />
                            Find a Service
                        </Button>
                    </Link>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                ) : requests.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Briefcase className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="font-medium text-slate-900 mb-1">No bookings yet</h3>
                            <p className="text-sm text-slate-500 mb-6">
                                When you request a service, it&apos;ll show up here.
                            </p>
                            <Link href="/consumer/services">
                                <Button>
                                    <Search className="h-4 w-4 mr-2" />
                                    Browse Services
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {requests.map(item => {
                            const isLinkable = item.status === 'accepted' || item.status === 'completed'
                            const card = (
                                <Card className={isLinkable ? 'hover:border-black/20 transition-colors' : ''}>
                                    <CardContent className="p-4 flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-slate-900 truncate">
                                                    {providerLabel(item.providers)}
                                                </h3>
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_STYLES[item.status]}`}>
                                                    {STATUS_LABELS[item.status]}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500 capitalize truncate">
                                                {item.service_category.replace('_', ' ')}
                                                {item.service_address ? ` · ${item.service_address}` : ''}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {new Date(item.completed_at || item.created_at).toLocaleDateString(undefined, {
                                                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                        {isLinkable && (
                                            <ChevronRight className="h-5 w-5 text-slate-300 flex-shrink-0" />
                                        )}
                                    </CardContent>
                                </Card>
                            )

                            return isLinkable ? (
                                <Link key={item.id} href={`/consumer/service-confirmation/${item.id}`}>
                                    {card}
                                </Link>
                            ) : (
                                <div key={item.id}>{card}</div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
