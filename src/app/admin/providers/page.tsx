'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminFetch } from '@/lib/admin/client'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { StatusBadge } from '@/components/admin/status-badge'
import type { AdminProviderRow, ApiResponse } from '@/types'
import { Search, Loader2, Download, ChevronLeft, ChevronRight, Star } from 'lucide-react'

const STATUSES = ['pending', 'verified', 'active', 'suspended', 'inactive']
const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected', 'expired']
const PAGE_SIZE = 25

function toCsv(rows: AdminProviderRow[]): string {
    const headers = ['id', 'first_name', 'last_name', 'business_name', 'email', 'phone', 'primary_service', 'status', 'verification_status', 'rating_average', 'total_jobs_completed', 'created_at']
    const lines = [headers.join(',')]
    for (const r of rows) {
        const row = headers.map((h) => {
            const val = (r as unknown as Record<string, unknown>)[h]
            const str = val === null || val === undefined ? '' : String(val)
            return `"${str.replace(/"/g, '""')}"`
        })
        lines.push(row.join(','))
    }
    return lines.join('\n')
}

export default function AdminProvidersPage() {
    const [providers, setProviders] = useState<AdminProviderRow[]>([])
    const [total, setTotal] = useState(0)
    const [offset, setOffset] = useState(0)
    const [q, setQ] = useState('')
    const [status, setStatus] = useState('')
    const [verificationStatus, setVerificationStatus] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            if (q) params.set('q', q)
            if (status) params.set('status', status)
            if (verificationStatus) params.set('verification_status', verificationStatus)
            params.set('limit', String(PAGE_SIZE))
            params.set('offset', String(offset))

            const res = await adminFetch<AdminProviderRow[]>(`/api/admin/providers?${params}`) as ApiResponse<AdminProviderRow[]> & { pagination?: { total: number } }
            setProviders(res.data || [])
            setTotal(res.pagination?.total || 0)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load providers')
        } finally {
            setLoading(false)
        }
    }, [q, status, verificationStatus, offset])

    useEffect(() => { load() }, [load])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setOffset(0)
        load()
    }

    const handleExport = () => {
        const csv = toCsv(providers)
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `providers-page-${offset}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Providers</h1>
                    <p className="text-slate-500 text-sm mt-1">{total} total</p>
                </div>
                <Button variant="outline" onClick={handleExport} disabled={providers.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV (this page)
                </Button>
            </div>

            <Card>
                <CardContent className="p-4">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search name, business, email..."
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <select
                            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                            value={status}
                            onChange={(e) => { setStatus(e.target.value); setOffset(0) }}
                        >
                            <option value="">All statuses</option>
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select
                            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                            value={verificationStatus}
                            onChange={(e) => { setVerificationStatus(e.target.value); setOffset(0) }}
                        >
                            <option value="">All verification</option>
                            {VERIFICATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <Button type="submit">Search</Button>
                    </form>
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
                    ) : providers.length === 0 ? (
                        <p className="text-sm text-slate-500 p-6">No providers found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-slate-500">
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium">Service</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Verification</th>
                                        <th className="px-4 py-3 font-medium">Rating</th>
                                        <th className="px-4 py-3 font-medium">Jobs</th>
                                        <th className="px-4 py-3 font-medium">Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {providers.map((p) => (
                                        <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <Link href={`/admin/providers/${p.id}`} className="font-medium text-slate-900 hover:underline">
                                                    {p.first_name} {p.last_name}
                                                </Link>
                                                <div className="text-xs text-slate-500">{p.business_name || p.email}</div>
                                            </td>
                                            <td className="px-4 py-3 capitalize text-slate-700">{p.primary_service}</td>
                                            <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                                            <td className="px-4 py-3"><StatusBadge status={p.verification_status} /></td>
                                            <td className="px-4 py-3 text-slate-700">
                                                {p.rating_average ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                                        {p.rating_average.toFixed(1)}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">{p.total_jobs_completed ?? 0}</td>
                                            <td className="px-4 py-3 text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
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
