'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminFetch } from '@/lib/admin/client'
import { Button, Input, Card, CardContent } from '@/components/ui'
import type { AdminConsumerRow, ApiResponse } from '@/types'
import { Search, Loader2, Download, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 25

function toCsv(rows: AdminConsumerRow[]): string {
    const headers = ['id', 'first_name', 'last_name', 'email', 'phone', 'default_address_city', 'created_at']
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

export default function AdminConsumersPage() {
    const [consumers, setConsumers] = useState<AdminConsumerRow[]>([])
    const [total, setTotal] = useState(0)
    const [offset, setOffset] = useState(0)
    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            if (q) params.set('q', q)
            params.set('limit', String(PAGE_SIZE))
            params.set('offset', String(offset))
            const res = await adminFetch<AdminConsumerRow[]>(`/api/admin/consumers?${params}`) as ApiResponse<AdminConsumerRow[]> & { pagination?: { total: number } }
            setConsumers(res.data || [])
            setTotal(res.pagination?.total || 0)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load consumers')
        } finally {
            setLoading(false)
        }
    }, [q, offset])

    useEffect(() => { load() }, [load])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setOffset(0)
        load()
    }

    const handleExport = () => {
        const csv = toCsv(consumers)
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `consumers-page-${offset}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Consumers</h1>
                    <p className="text-slate-500 text-sm mt-1">{total} total</p>
                </div>
                <Button variant="outline" onClick={handleExport} disabled={consumers.length === 0}>
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
                                    placeholder="Search name or email..."
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
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
                    ) : consumers.length === 0 ? (
                        <p className="text-sm text-slate-500 p-6">No consumers found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-slate-500">
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium">Email</th>
                                        <th className="px-4 py-3 font-medium">Phone</th>
                                        <th className="px-4 py-3 font-medium">City</th>
                                        <th className="px-4 py-3 font-medium">Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {consumers.map((c) => (
                                        <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <Link href={`/admin/consumers/${c.id}`} className="font-medium text-slate-900 hover:underline">
                                                    {c.first_name} {c.last_name}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">{c.email}</td>
                                            <td className="px-4 py-3 text-slate-700">{c.phone || '—'}</td>
                                            <td className="px-4 py-3 text-slate-700">{c.default_address_city || '—'}</td>
                                            <td className="px-4 py-3 text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
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
