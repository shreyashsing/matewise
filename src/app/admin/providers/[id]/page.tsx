'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { adminFetch } from '@/lib/admin/client'
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { StatusBadge } from '@/components/admin/status-badge'
import type { AdminProviderRow } from '@/types'
import {
    Loader2, ArrowLeft, Save, FileText, ExternalLink, AlertTriangle,
    CheckCircle2, XCircle, Ban, PlayCircle, Trash2, Star
} from 'lucide-react'

const STATUS_OPTIONS = ['pending', 'verified', 'active', 'suspended', 'inactive']
const VERIFICATION_OPTIONS = ['pending', 'verified', 'rejected', 'expired']

const DOCUMENT_FIELDS: { field: keyof AdminProviderRow; label: string }[] = [
    { field: 'id_document_url', label: 'ID / Passport' },
    { field: 'business_license_url', label: 'Business License' },
    { field: 'insurance_document_url', label: 'Insurance Certificate' },
]

type EditableForm = {
    first_name: string
    last_name: string
    phone: string
    business_name: string
    description: string
    hourly_rate: string
    minimum_charge: string
    years_experience: string
    service_radius_km: string
    address_street: string
    address_city: string
    address_postcode: string
    address_county: string
    admin_notes: string
}

export default function AdminProviderDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()

    const [provider, setProvider] = useState<AdminProviderRow | null>(null)
    const [form, setForm] = useState<EditableForm | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [docLoading, setDocLoading] = useState<string | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState('')
    const [deleting, setDeleting] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await adminFetch<AdminProviderRow>(`/api/admin/providers/${id}`)
            const p = res.data
            if (!p) throw new Error('Provider not found')
            setProvider(p)
            setForm({
                first_name: p.first_name || '',
                last_name: p.last_name || '',
                phone: p.phone || '',
                business_name: p.business_name || '',
                description: p.description || '',
                hourly_rate: p.hourly_rate?.toString() || '',
                minimum_charge: p.minimum_charge?.toString() || '',
                years_experience: p.years_experience?.toString() || '',
                service_radius_km: p.service_radius_km?.toString() || '',
                address_street: p.address_street || '',
                address_city: p.address_city || '',
                address_postcode: p.address_postcode || '',
                address_county: p.address_county || '',
                admin_notes: p.admin_notes || ''
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load provider')
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { load() }, [load])

    const patch = async (updates: Record<string, unknown>, successMessage: string) => {
        setSaving(true)
        setError(null)
        setMessage(null)
        try {
            const res = await adminFetch<AdminProviderRow>(`/api/admin/providers/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(updates)
            })
            setProvider(res.data || null)
            setMessage(successMessage)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed')
        } finally {
            setSaving(false)
        }
    }

    const handleSaveDetails = () => {
        if (!form) return
        patch({
            first_name: form.first_name,
            last_name: form.last_name,
            phone: form.phone,
            business_name: form.business_name,
            description: form.description,
            hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
            minimum_charge: form.minimum_charge ? Number(form.minimum_charge) : null,
            years_experience: form.years_experience ? Number(form.years_experience) : null,
            service_radius_km: form.service_radius_km ? Number(form.service_radius_km) : undefined,
            address_street: form.address_street,
            address_city: form.address_city,
            address_postcode: form.address_postcode,
            address_county: form.address_county,
            admin_notes: form.admin_notes
        }, 'Provider details saved')
    }

    const handleStatusChange = (status: string) => {
        let reason: string | null = null
        if (status === 'suspended' || status === 'inactive') {
            reason = window.prompt(`Reason for setting status to "${status}"?`) || ''
        }
        const updates: Record<string, unknown> = { status }
        if (reason) updates.suspended_reason = reason
        patch(updates, `Status changed to ${status}`)
    }

    const handleVerificationChange = (verification_status: string) => {
        patch({ verification_status }, `Verification set to ${verification_status}`)
    }

    const handleViewDocument = async (field: string, index?: number) => {
        setDocLoading(field + (index ?? ''))
        setError(null)
        try {
            const res = await adminFetch<{ url: string }>(`/api/admin/providers/${id}/documents/sign`, {
                method: 'POST',
                body: JSON.stringify({ field, index })
            })
            if (res.data?.url) {
                window.open(res.data.url, '_blank', 'noopener,noreferrer')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to open document')
        } finally {
            setDocLoading(null)
        }
    }

    const handleDelete = async () => {
        if (!provider || deleteConfirm !== provider.email) return
        setDeleting(true)
        setError(null)
        try {
            await adminFetch(`/api/admin/providers/${id}`, { method: 'DELETE' })
            router.push('/admin/providers')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed')
            setDeleting(false)
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
    }

    if (!provider || !form) {
        return (
            <div className="space-y-4">
                <Link href="/admin/providers" className="text-sm text-slate-600 inline-flex items-center gap-1 hover:underline">
                    <ArrowLeft className="h-4 w-4" /> Back to providers
                </Link>
                <p className="text-red-700 text-sm">{error || 'Provider not found'}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <Link href="/admin/providers" className="text-sm text-slate-500 inline-flex items-center gap-1 hover:underline mb-2">
                        <ArrowLeft className="h-4 w-4" /> Back to providers
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {provider.first_name} {provider.last_name}
                        {provider.business_name && <span className="text-slate-500 font-normal"> · {provider.business_name}</span>}
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <StatusBadge status={provider.status} />
                        <StatusBadge status={provider.verification_status} />
                    </div>
                </div>
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

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card><CardContent className="p-4">
                    <p className="text-xs text-slate-500">Rating</p>
                    <p className="text-lg font-bold flex items-center gap-1">
                        {provider.rating_average ? <><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{provider.rating_average.toFixed(1)}</> : '—'}
                    </p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-xs text-slate-500">Reviews</p>
                    <p className="text-lg font-bold">{provider.total_reviews ?? 0}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-xs text-slate-500">Jobs Completed</p>
                    <p className="text-lg font-bold">{provider.total_jobs_completed ?? 0}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-xs text-slate-500">Joined</p>
                    <p className="text-lg font-bold">{new Date(provider.created_at).toLocaleDateString()}</p>
                </CardContent></Card>
            </div>

            {/* Status controls */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Status &amp; Verification</CardTitle>
                    <CardDescription>Changes apply immediately and are recorded in the activity log.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Account Status</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {STATUS_OPTIONS.map((s) => (
                                <Button
                                    key={s}
                                    variant={provider.status === s ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={saving || provider.status === s}
                                    onClick={() => handleStatusChange(s)}
                                    className="capitalize"
                                >
                                    {s === 'active' && <PlayCircle className="h-3.5 w-3.5 mr-1.5" />}
                                    {s === 'suspended' && <Ban className="h-3.5 w-3.5 mr-1.5" />}
                                    {s}
                                </Button>
                            ))}
                        </div>
                        {provider.suspended_reason && (
                            <p className="text-xs text-slate-500 mt-2">Reason on file: {provider.suspended_reason}</p>
                        )}
                    </div>
                    <div>
                        <Label>Document Verification</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {VERIFICATION_OPTIONS.map((s) => (
                                <Button
                                    key={s}
                                    variant={provider.verification_status === s ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={saving || provider.verification_status === s}
                                    onClick={() => handleVerificationChange(s)}
                                    className="capitalize"
                                >
                                    {s === 'verified' && <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                                    {s === 'rejected' && <XCircle className="h-3.5 w-3.5 mr-1.5" />}
                                    {s}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Verification documents */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Verification Documents</CardTitle>
                    <CardDescription>
                        Links are generated on demand and expire in 10 minutes.
                        {provider.documents_uploaded_at && ` Uploaded ${new Date(provider.documents_uploaded_at).toLocaleString()}.`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {DOCUMENT_FIELDS.map(({ field, label }) => {
                        const hasDoc = Boolean(provider[field])
                        return (
                            <div key={field as string} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                                <div className="flex items-center gap-2 text-sm">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                    {label}
                                </div>
                                {hasDoc ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={docLoading === field}
                                        onClick={() => handleViewDocument(field as string)}
                                    >
                                        {docLoading === field ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ExternalLink className="h-3.5 w-3.5 mr-1.5" />}
                                        View
                                    </Button>
                                ) : (
                                    <span className="text-xs text-slate-400">Not uploaded</span>
                                )}
                            </div>
                        )
                    })}
                    {(provider.certification_urls || []).map((_, idx) => (
                        <div key={`cert-${idx}`} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                            <div className="flex items-center gap-2 text-sm">
                                <FileText className="h-4 w-4 text-slate-400" />
                                Certification {idx + 1}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={docLoading === `certification_urls${idx}`}
                                onClick={() => handleViewDocument('certification_urls', idx)}
                            >
                                {docLoading === `certification_urls${idx}` ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ExternalLink className="h-3.5 w-3.5 mr-1.5" />}
                                View
                            </Button>
                        </div>
                    ))}
                    {!provider.id_document_url && !provider.business_license_url && !provider.insurance_document_url && !(provider.certification_urls || []).length && (
                        <p className="text-sm text-slate-400">No documents uploaded yet.</p>
                    )}
                </CardContent>
            </Card>

            {/* Editable details */}
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
                            <Input id="email" value={provider.email} disabled />
                        </div>
                        <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="business_name">Business Name</Label>
                            <Input id="business_name" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="service">Primary Service (read-only)</Label>
                            <Input id="service" value={provider.primary_service} disabled className="capitalize" />
                        </div>
                        <div>
                            <Label htmlFor="hourly_rate">Hourly Rate (£)</Label>
                            <Input id="hourly_rate" type="number" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="minimum_charge">Minimum Charge (£)</Label>
                            <Input id="minimum_charge" type="number" value={form.minimum_charge} onChange={(e) => setForm({ ...form, minimum_charge: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="years_experience">Years Experience</Label>
                            <Input id="years_experience" type="number" value={form.years_experience} onChange={(e) => setForm({ ...form, years_experience: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="service_radius_km">Service Radius (km)</Label>
                            <Input id="service_radius_km" type="number" value={form.service_radius_km} onChange={(e) => setForm({ ...form, service_radius_km: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="description">Description</Label>
                        <textarea
                            id="description"
                            className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm mt-1.5 min-h-[80px]"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="address_street">Street</Label>
                            <Input id="address_street" value={form.address_street} onChange={(e) => setForm({ ...form, address_street: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="address_city">City</Label>
                            <Input id="address_city" value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="address_postcode">Postcode</Label>
                            <Input id="address_postcode" value={form.address_postcode} onChange={(e) => setForm({ ...form, address_postcode: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="address_county">County</Label>
                            <Input id="address_county" value={form.address_county} onChange={(e) => setForm({ ...form, address_county: e.target.value })} />
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

                    <Button onClick={handleSaveDetails} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </Button>
                </CardContent>
            </Card>

            {/* Recent service requests */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Recent Service Requests</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {!provider.recent_service_requests || provider.recent_service_requests.length === 0 ? (
                        <p className="text-sm text-slate-400 p-4">No service requests yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-slate-500">
                                        <th className="px-4 py-2 font-medium">Consumer</th>
                                        <th className="px-4 py-2 font-medium">Category</th>
                                        <th className="px-4 py-2 font-medium">Status</th>
                                        <th className="px-4 py-2 font-medium">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {provider.recent_service_requests.map((r) => (
                                        <tr key={r.id} className="border-b border-slate-50 last:border-0">
                                            <td className="px-4 py-2">{r.consumer_name}</td>
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

            {/* Danger zone */}
            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="text-lg text-red-700">Danger Zone</CardTitle>
                    <CardDescription>Permanently delete this provider and their login. This cannot be undone.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Label htmlFor="delete_confirm">Type the provider&apos;s email (<span className="font-mono">{provider.email}</span>) to confirm</Label>
                    <Input id="delete_confirm" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={provider.email} />
                    <Button
                        variant="destructive"
                        disabled={deleteConfirm !== provider.email || deleting}
                        onClick={handleDelete}
                    >
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                        Delete Provider
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
