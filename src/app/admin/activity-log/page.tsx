'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminFetch } from '@/lib/admin/client'
import { Card, CardContent, Button } from '@/components/ui'
import type { AdminActivityLogEntry, ApiResponse } from '@/types'
import { Loader2, ChevronLeft, ChevronRight, UserCog, Trash2, Pencil } from 'lucide-react'

const PAGE_SIZE = 50

function actionIcon(action: string) {
    if (action.endsWith('.deleted')) return <Trash2 className="h-4 w-4 text-red-600" />
    if (action.endsWith('.updated')) return <Pencil className="h-4 w-4 text-blue-600" />
    return <UserCog className="h-4 w-4 text-slate-500" />
}

export default function AdminActivityLogPage() {
    const [entries, setEntries] = useState<AdminActivityLogEntry[]>([])
    const [total, setTotal] = useState(0)
    const [offset, setOffset] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            params.set('limit', String(PAGE_SIZE))
            params.set('offset', String(offset))
            const res = await adminFetch<AdminActivityLogEntry[]>(`/api/admin/activity-log?${params}`) as ApiResponse<AdminActivityLogEntry[]> & { pagination?: { total: number } }
            setEntries(res.data || [])
            setTotal(res.pagination?.total || 0)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load activity log')
        } finally {
            setLoading(false)
        }
    }, [offset])

    useEffect(() => { load() }, [load])

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
                <p className="text-slate-500 text-sm mt-1">{total} recorded admin actions</p>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : error ? (
                        <p className="text-sm text-red-700 p-6">{error}</p>
                    ) : entries.length === 0 ? (
                        <p className="text-sm text-slate-500 p-6">No activity recorded yet.</p>
                    ) : (
                        <ul className="divide-y divide-slate-50">
                            {entries.map((entry) => (
                                <li key={entry.id} className="px-4 py-3 flex items-start gap-3">
                                    <div className="mt-0.5">{actionIcon(entry.action)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-800">
                                            <span className="font-medium">{entry.admin_email}</span>{' '}
                                            <span className="text-slate-500">{entry.action.replace(/[._]/g, ' ')}</span>{' '}
                                            <span className="capitalize text-slate-500">({entry.entity_type})</span>
                                        </p>
                                        {entry.details ? (
                                            <pre className="text-xs text-slate-400 mt-1 whitespace-pre-wrap break-words">
                                                {JSON.stringify(entry.details, null, 0)}
                                            </pre>
                                        ) : null}
                                    </div>
                                    <span className="text-xs text-slate-400 whitespace-nowrap">
                                        {new Date(entry.created_at).toLocaleString()}
                                    </span>
                                </li>
                            ))}
                        </ul>
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
