'use client'

import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/admin/client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui'
import type { AdminStats } from '@/types'
import { Users, Briefcase, ClipboardCheck, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

function StatCard({
    icon: Icon,
    label,
    value,
    hint
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: string | number
    hint?: string
}) {
    return (
        <Card>
            <CardContent className="p-5 flex items-start justify-between">
                <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                    {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
                </div>
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-slate-700" />
                </div>
            </CardContent>
        </Card>
    )
}

function BarList({ items, colorClass }: { items: { label: string; count: number }[]; colorClass: string }) {
    const max = Math.max(...items.map(i => i.count), 1)
    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize text-slate-700">{item.label.replace(/_/g, ' ')}</span>
                        <span className="text-slate-500">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                            className={`h-full rounded-full ${colorClass}`}
                            style={{ width: `${(item.count / max) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}

function SignupsSparkline({ data }: { data: AdminStats['signups_last_30_days'] }) {
    const max = Math.max(...data.map(d => d.consumers + d.providers), 1)
    return (
        <div className="flex items-end gap-[3px] h-32">
            {data.map((d) => {
                const total = d.consumers + d.providers
                const consumerH = max ? (d.consumers / max) * 100 : 0
                const providerH = max ? (d.providers / max) * 100 : 0
                return (
                    <div
                        key={d.date}
                        className="flex-1 flex flex-col justify-end h-full group relative"
                        title={`${d.date}: ${d.consumers} consumers, ${d.providers} providers`}
                    >
                        <div className="w-full bg-blue-400 rounded-t-sm" style={{ height: `${providerH}%` }} />
                        <div className="w-full bg-emerald-400" style={{ height: `${consumerH}%` }} />
                        {total === 0 && <div className="w-full bg-slate-100" style={{ height: '2px' }} />}
                    </div>
                )
            })}
        </div>
    )
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        adminFetch<AdminStats>('/api/admin/stats')
            .then((res) => setStats(res.data || null))
            .catch((err) => setError(err.message || 'Failed to load stats'))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    if (error || !stats) {
        return (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg max-w-lg">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error || 'Failed to load stats'}</p>
            </div>
        )
    }

    const pendingProviders = stats.providers_by_status.find(s => s.status === 'pending')?.count || 0
    const pendingVerification = stats.providers_by_verification.find(s => s.status === 'pending')?.count || 0

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-500 text-sm mt-1">Platform overview and activity</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Briefcase} label="Total Providers" value={stats.total_providers} hint={`${pendingProviders} pending approval`} />
                <StatCard icon={Users} label="Total Consumers" value={stats.total_consumers} />
                <StatCard icon={ClipboardCheck} label="Requests Completed" value={stats.completed_requests_total} />
                <StatCard icon={CheckCircle2} label="Total Jobs Completed" value={stats.jobs_completed_total} hint="Sum across all providers" />
            </div>

            {pendingVerification > 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-800">
                        {pendingVerification} provider{pendingVerification === 1 ? '' : 's'} awaiting document verification.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Signups (last 30 days)</CardTitle>
                        <CardDescription>
                            <span className="inline-flex items-center gap-1 mr-3"><span className="h-2 w-2 rounded-full bg-blue-400 inline-block" /> Providers</span>
                            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> Consumers</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SignupsSparkline data={stats.signups_last_30_days} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Providers by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <BarList
                            items={stats.providers_by_status.map(s => ({ label: s.status, count: s.count }))}
                            colorClass="bg-slate-700"
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Requests by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <BarList
                            items={stats.requests_by_status.map(s => ({ label: s.status, count: s.count }))}
                            colorClass="bg-blue-600"
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Top Service Categories</CardTitle>
                        <CardDescription>By provider count</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <BarList
                            items={stats.providers_by_service.slice(0, 6).map(s => ({ label: s.service, count: s.count }))}
                            colorClass="bg-emerald-600"
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
