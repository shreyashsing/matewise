'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminFetch } from '@/lib/admin/client'
import { Card, CardContent, Button } from '@/components/ui'
import { StatusBadge } from '@/components/admin/status-badge'
import type { AdminServiceRequestSummary, ApiResponse } from '@/types'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

const STATUSES = ['pending', 'accepted', 'rejected', 'expired', 'completed']
const PAGE_SIZE = 25

export default function AdminServiceRequestsPage() {
    const [requests, setRequests] = useState<AdminServiceRequestSummary[]>([])
    const [total, setTotal] = useState(0)
    const [offset, setOffset] = useState(0)
    const [status, setStatus] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            if (status) params.set('status', status)
            params.set('limit', String(PAGE_SIZE))
            params.set('offset', String(offset))
            const res = await adminFetch<AdminServiceRequestSummary[]>(`/api/admin/service-requests?${params}`) as ApiResponse<AdminServiceRequestSummary[]> & { pagination?: { total: number } }
            setRequests(res.data || [])
            setTotal(res.pagination?.total || 0)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load service requests')
        } finally {
            setLoading(false)
        }
    }, [status, offset])

    useEffect(() => { load() }, [load])

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Service Requests</h1>
                <p className="text-slate-500 text-sm mt-1">{total} total</p>
            </div>

            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={status === '' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => { setStatus(''); setOffset(0) }}
                        >
                            All
                        </Button>
                        {STATUSES.map((s) => (
                            <Button
                                key={s}
                                variant={status === s ? 'default' : 'outline'}
                                size="sm"
                                className="capitalize"
                                onClick={() => { setStatus(s); setOffset(0) }}
                            >
                                {s}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : error ? (
                        <p className="text-sm text-red-700 p-6">{error}</p>
                    ) : requests.length === 0 ? (
                        <p className="text-sm text-slate-500 p-6">No service requests found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-slate-500">
                                        <th className="px-4 py-3 font-medium">Consumer</th>
                                        <th className="px-4 py-3 font-medium">Provider</th>
                                        <th className="px-4 py-3 font-medium">Category</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Verified</th>
                                        <th className="px-4 py-3 font-medium">Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map((r) => (
                                        <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                                            <td className="px-4 py-3 text-slate-700">{r.consumer_name}</td>
                                            <td className="px-4 py-3">
                                                {r.provider_id ? (
                                                    <Link href={`/admin/providers/${r.provider_id}`} className="text-slate-900 hover:underline">
                                                        {r.providers?.business_name || `${r.providers?.first_name || ''} ${r.providers?.last_name || ''}`.trim()}
                                                    </Link>
                                                ) : '—'}
                                            </td>
                                            <td className="px-4 py-3 capitalize text-slate-700">{r.service_category}</td>
                                            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                                            <td className="px-4 py-3 text-slate-700">{r.otp_verified ? 'Yes' : 'No'}</td>
                                            <td className="px-4 py-3 text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {total > PAGE_SIZE && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
