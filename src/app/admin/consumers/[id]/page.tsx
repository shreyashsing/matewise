'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { adminFetch } from '@/lib/admin/client'
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { StatusBadge } from '@/components/admin/status-badge'
import type { AdminConsumerRow } from '@/types'
import { Loader2, ArrowLeft, Save, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react'

type EditableForm = {
    first_name: string
    last_name: string
    phone: string
    default_address_street: string
    default_address_city: string
    default_address_postcode: string
    default_address_county: string
    admin_notes: string
}

export default function AdminConsumerDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()

    const [consumer, setConsumer] = useState<AdminConsumerRow | null>(null)
    const [form, setForm] = useState<EditableForm | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState('')
    const [deleting, setDeleting] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await adminFetch<AdminConsumerRow>(`/api/admin/consumers/${id}`)
            const c = res.data
            if (!c) throw new Error('Consumer not found')
            setConsumer(c)
            setForm({
                first_name: c.first_name || '',
                last_name: c.last_name || '',
                phone: c.phone || '',
                default_address_street: c.default_address_street || '',
                default_address_city: c.default_address_city || '',
                default_address_postcode: c.default_address_postcode || '',
                default_address_county: c.default_address_county || '',
                admin_notes: c.admin_notes || ''
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load consumer')
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { load() }, [load])

    const handleSave = async () => {
        if (!form) return
        setSaving(true)
        setError(null)
        setMessage(null)
        try {
            const res = await adminFetch<AdminConsumerRow>(`/api/admin/consumers/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(form)
            })
            setConsumer(res.data || null)
            setMessage('Consumer details saved')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!consumer || deleteConfirm !== consumer.email) return
        setDeleting(true)
        setError(null)
        try {
            await adminFetch(`/api/admin/consumers/${id}`, { method: 'DELETE' })
            router.push('/admin/consumers')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed')
            setDeleting(false)
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
    }

    if (!consumer || !form) {
        return (
            <div className="space-y-4">
                <Link href="/admin/consumers" className="text-sm text-slate-600 inline-flex items-center gap-1 hover:underline">
                    <ArrowLeft className="h-4 w-4" /> Back to consumers
                </Link>
                <p className="text-red-700 text-sm">{error || 'Consumer not found'}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <Link href="/admin/consumers" className="text-sm text-slate-500 inline-flex items-center gap-1 hover:underline mb-2">
                    <ArrowLeft className="h-4 w-4" /> Back to consumers
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">{consumer.first_name} {consumer.last_name}</h1>
                <p className="text-slate-500 text-sm mt-1">{consumer.email} · Joined {new Date(consumer.created_at).toLocaleDateString()}</p>
            </div>

            {error && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}
            {message && (
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-700">{message}</p>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="first_name">First Name</Label>
                            <Input id="first_name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="last_name">Last Name</Label>
                            <Input id="last_name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="email">Email (read-only)</Label>
                            <Input id="email" value={consumer.email} disabled />
                        </div>
                        <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="default_address_street">Street</Label>
                            <Input id="default_address_street" value={form.default_address_street} onChange={(e) => setForm({ ...form, default_address_street: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="default_address_city">City</Label>
                            <Input id="default_address_city" value={form.default_address_city} onChange={(e) => setForm({ ...form, default_address_city: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="default_address_postcode">Postcode</Label>
                            <Input id="default_address_postcode" value={form.default_address_postcode} onChange={(e) => setForm({ ...form, default_address_postcode: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="default_address_county">County</Label>
                            <Input id="default_address_county" value={form.default_address_county} onChange={(e) => setForm({ ...form, default_address_county: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="admin_notes">Admin Notes (internal only)</Label>
                        <textarea
                            id="admin_notes"
                            className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm mt-1.5 min-h-[60px]"
                            value={form.admin_notes}
                            onChange={(e) => setForm({ ...form, admin_notes: e.target.value })}
                        />
                    </div>

                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Recent Service Requests</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {!consumer.recent_service_requests || consumer.recent_service_requests.length === 0 ? (
                        <p className="text-sm text-slate-400 p-4">No service requests yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-slate-500">
                                        <th className="px-4 py-2 font-medium">Provider</th>
                                        <th className="px-4 py-2 font-medium">Category</th>
                                        <th className="px-4 py-2 font-medium">Status</th>
                                        <th className="px-4 py-2 font-medium">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {consumer.recent_service_requests.map((r) => (
                                        <tr key={r.id} className="border-b border-slate-50 last:border-0">
                                            <td className="px-4 py-2">
                                                {r.providers?.business_name || `${r.providers?.first_name || ''} ${r.providers?.last_name || ''}`.trim() || '—'}
                                            </td>
                                            <td className="px-4 py-2 capitalize">{r.service_category}</td>
                                            <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                                            <td className="px-4 py-2 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="text-lg text-red-700">Danger Zone</CardTitle>
                    <CardDescription>Permanently delete this consumer and their login. This cannot be undone.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Label htmlFor="delete_confirm">Type the consumer&apos;s email (<span className="font-mono">{consumer.email}</span>) to confirm</Label>
                    <Input id="delete_confirm" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={consumer.email} />
                    <Button
                        variant="destructive"
                        disabled={deleteConfirm !== consumer.email || deleting}
                        onClick={handleDelete}
                    >
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                        Delete Consumer
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
