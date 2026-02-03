'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui'
import { Button, Input, Label } from '@/components/ui'
import {
    SprayCan,
    Wrench,
    Truck,
    Leaf,
    Zap,
    Book,
    Heart,
    PaintBucket,
    ArrowLeft,
    CheckCircle2,
    Briefcase,
    UserCircle,
    Mail,
    Phone,
    Lock,
    MapPin,
    Building2,
    Clock,
    Loader2,
    Dog,
    Lightbulb,
    Upload,
    FileText,
    X
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { GoogleMapsProvider, LocationPicker } from '@/components/maps'
import type { ServiceCategory, GeoLocation, Address, ProviderRegistrationData } from '@/types'

// Service options configuration
const SERVICE_TYPES: { id: ServiceCategory; title: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
        id: 'cleaning',
        title: 'Cleaning',
        description: 'House cleaning, deep cleaning, and organization.',
        icon: SprayCan
    },
    {
        id: 'repairs',
        title: 'Repairs & Maintenance',
        description: 'General repairs, handyman services, and fixes.',
        icon: Wrench
    },
    {
        id: 'moving',
        title: 'Moving & Storage',
        description: 'Packing, heavy lifting, and furniture assembly.',
        icon: Truck
    },
    {
        id: 'gardening',
        title: 'Gardening',
        description: 'Lawn care, landscaping, and outdoor maintenance.',
        icon: Leaf
    },
    {
        id: 'plumbing',
        title: 'Plumbing',
        description: 'Leak fixes, pipe installation, and maintenance.',
        icon: Zap
    },
    {
        id: 'painting',
        title: 'Painting',
        description: 'Interior and exterior painting services.',
        icon: PaintBucket
    },
    {
        id: 'electrical',
        title: 'Electrical',
        description: 'Wiring, installations, and electrical repairs.',
        icon: Lightbulb
    },
    {
        id: 'tutoring',
        title: 'Tutoring',
        description: 'Academic help, language learning, and skills.',
        icon: Book
    },
    {
        id: 'care',
        title: 'Personal Care',
        description: 'Elderly care, assistance, and support services.',
        icon: Heart
    },
    {
        id: 'pets',
        title: 'Pet Services',
        description: 'Pet sitting, walking, and grooming services.',
        icon: Dog
    }
]

const TOTAL_STEPS = 4

export default function ProviderRegistrationPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showSuccess, setShowSuccess] = useState(false)

    // Form state
    const [formData, setFormData] = useState<ProviderRegistrationData>({
        primary_service: '' as ServiceCategory,
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        business_name: '',
        description: '',
        years_experience: undefined,
        hourly_rate: undefined,
        address: {
            street: '',
            city: '',
            postcode: '',
            county: '',
            country: 'United Kingdom',
            formatted_address: ''
        },
        location: {
            latitude: 0,
            longitude: 0
        },
        service_radius_km: 10
    })

    // Document upload state
    const [uploadedFiles, setUploadedFiles] = useState<{
        idDocument?: File
        businessLicense?: File
        certifications: File[]
        insuranceDocument?: File
    }>({
        certifications: []
    })

    // Validation
    const isStep1Valid = !!formData.primary_service
    const isStep2Valid = 
        formData.first_name.trim() !== '' &&
        formData.last_name.trim() !== '' &&
        formData.email.trim() !== '' &&
        formData.phone.trim() !== '' &&
        formData.password.length >= 8
    const isStep3Valid = true // Business details are optional
    const isStep4Valid = 
        formData.address.street.trim() !== '' &&
        formData.address.city.trim() !== '' &&
        formData.address.postcode.trim() !== '' &&
        formData.location.latitude !== 0 &&
        formData.location.longitude !== 0

    const canProceed = () => {
        switch (step) {
            case 1: return isStep1Valid
            case 2: return isStep2Valid
            case 3: return isStep3Valid
            case 4: return isStep4Valid
            default: return false
        }
    }

    const handleContinue = async () => {
        setError(null)
        
        if (step < TOTAL_STEPS) {
            setStep(step + 1)
            window.scrollTo(0, 0)
        } else {
            // Submit registration
            await handleSubmit()
        }
    }

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1)
            setError(null)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value, type } = e.target as HTMLInputElement
        
        if (type === 'number') {
            setFormData(prev => ({ 
                ...prev, 
                [id]: value === '' ? undefined : parseFloat(value)
            }))
        } else {
            setFormData(prev => ({ ...prev, [id]: value }))
        }
    }

    const handleLocationSelect = (location: GeoLocation, address: Address) => {
        setFormData(prev => ({
            ...prev,
            location,
            address
        }))
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const files = e.target.files
        if (!files) return

        if (field === 'certifications') {
            setUploadedFiles(prev => ({
                ...prev,
                certifications: [...prev.certifications, ...Array.from(files)]
            }))
        } else {
            setUploadedFiles(prev => ({
                ...prev,
                [field]: files[0]
            }))
        }
    }

    const removeFile = (field: string, index?: number) => {
        if (field === 'certifications' && index !== undefined) {
            setUploadedFiles(prev => ({
                ...prev,
                certifications: prev.certifications.filter((_, i) => i !== index)
            }))
        } else {
            setUploadedFiles(prev => ({
                ...prev,
                [field]: undefined
            }))
        }
    }

    const handleSubmit = async () => {
        setIsLoading(true)
        setError(null)

        try {
            // Upload documents first if any
            const documentUrls: Record<string, any> = {}
            
            if (uploadedFiles.idDocument || uploadedFiles.businessLicense || 
                uploadedFiles.insuranceDocument || uploadedFiles.certifications.length > 0) {
                
                const uploadFormData = new FormData()
                
                if (uploadedFiles.idDocument) {
                    uploadFormData.append('id_document', uploadedFiles.idDocument)
                }
                if (uploadedFiles.businessLicense) {
                    uploadFormData.append('business_license', uploadedFiles.businessLicense)
                }
                if (uploadedFiles.insuranceDocument) {
                    uploadFormData.append('insurance_document', uploadedFiles.insuranceDocument)
                }
                uploadedFiles.certifications.forEach((cert, index) => {
                    uploadFormData.append(`certification_${index}`, cert)
                })

                // Upload to temporary endpoint (will create this)
                const uploadResponse = await fetch('/api/providers/upload-documents', {
                    method: 'POST',
                    body: uploadFormData
                })

                if (uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json()
                    if (uploadResult.success) {
                        Object.assign(documentUrls, uploadResult.data)
                    }
                }
            }

            const response = await fetch('/api/providers/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    ...documentUrls
                })
            })

            const result = await response.json()

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Registration failed')
            }

            setShowSuccess(true)
            
            // Redirect to login after showing success
            setTimeout(() => {
                router.push('/provider/login')
            }, 3000)

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    // Success screen
    if (showSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <Card className="max-w-md w-full">
                    <CardContent className="p-8 text-center">
                        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            Registration Successful!
                        </h1>
                        <p className="text-slate-500 mb-2">
                            Your account has been created successfully.
                        </p>
                        <p className="text-sm text-slate-600 mb-6">
                            Please sign in with your email and password to access your dashboard.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Redirecting to login...
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-black selection:text-white flex flex-col">
            {/* Header */}
            <header className="px-6 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {step === 1 ? (
                        <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-black">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    ) : (
                        <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-black">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    )}
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 bg-black rounded flex items-center justify-center text-white font-bold text-xs">M</div>
                        <span className="font-semibold tracking-tight text-sm text-slate-900">Provider Registration</span>
                    </div>
                </div>
                <div className="text-sm font-medium text-slate-400">
                    Step {step} of {TOTAL_STEPS}
                </div>
            </header>

            {/* Progress Bar */}
            <div className="h-1 bg-slate-100">
                <div 
                    className="h-full bg-black transition-all duration-500 ease-out"
                    style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                />
            </div>

            {/* Main Content */}
            <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl animate-in fade-in duration-500">
                
                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Step 1: Service Selection */}
                {step === 1 && (
                    <>
                        <div className="mb-10 text-center max-w-2xl mx-auto space-y-3">
                            <div className="h-12 w-12 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-4 text-black">
                                <Briefcase className="h-6 w-6" />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                                What service do you provide?
                            </h1>
                            <p className="text-lg text-slate-500 leading-relaxed">
                                Choose the primary category that best describes your expertise. You can add more later.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-24">
                            {SERVICE_TYPES.map((service) => {
                                const isSelected = formData.primary_service === service.id
                                const Icon = service.icon

                                return (
                                    <div
                                        key={service.id}
                                        onClick={() => setFormData(prev => ({ ...prev, primary_service: service.id }))}
                                        className={cn(
                                            "group relative cursor-pointer outline-none transition-all duration-300",
                                            isSelected ? "ring-2 ring-black ring-offset-2" : "hover:scale-[1.01]"
                                        )}
                                    >
                                        <Card className={cn(
                                            "h-full border-2 transition-all duration-300 overflow-hidden",
                                            isSelected
                                                ? "border-black bg-slate-50"
                                                : "border-transparent hover:border-slate-200 hover:shadow-lg bg-white"
                                        )}>
                                            <CardContent className="p-6 flex flex-col items-center text-center h-full relative z-10">
                                                <div className={cn(
                                                    "h-12 w-12 rounded-full flex items-center justify-center mb-4 transition-colors duration-300",
                                                    isSelected ? "bg-black text-white" : "bg-slate-100 text-slate-600 group-hover:bg-black/5 group-hover:text-black"
                                                )}>
                                                    <Icon className="h-6 w-6" />
                                                </div>

                                                <h3 className="font-bold text-lg mb-2 text-slate-900">
                                                    {service.title}
                                                </h3>
                                                <p className="text-sm text-slate-500 leading-snug">
                                                    {service.description}
                                                </p>

                                                {isSelected && (
                                                    <div className="absolute top-4 right-4 text-black animate-in fade-in zoom-in duration-300">
                                                        <CheckCircle2 className="h-5 w-5 fill-current" />
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                {/* Step 2: Personal Information */}
                {step === 2 && (
                    <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500 mb-20">
                        <div className="mb-8 text-center space-y-2">
                            <div className="h-12 w-12 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-4 text-black">
                                <UserCircle className="h-6 w-6" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Personal Information</h1>
                            <p className="text-slate-500">
                                Create your account for <span className="font-semibold text-black">{SERVICE_TYPES.find(s => s.id === formData.primary_service)?.title}</span> services.
                            </p>
                        </div>

                        <Card className="border-slate-200 shadow-sm bg-white">
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="first_name">First Name *</Label>
                                        <Input
                                            id="first_name"
                                            placeholder="John"
                                            value={formData.first_name}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="last_name">Last Name *</Label>
                                        <Input
                                            id="last_name"
                                            placeholder="Doe"
                                            value={formData.last_name}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email *</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            className="pl-10"
                                            placeholder="john@example.com"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number *</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="phone"
                                            type="tel"
                                            className="pl-10"
                                            placeholder="+44 7700 900000"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Password *</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="password"
                                            type="password"
                                            className="pl-10"
                                            placeholder="Create a secure password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            required
                                            minLength={8}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        Must be at least 8 characters.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Step 3: Business Details */}
                {step === 3 && (
                    <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500 mb-20">
                        <div className="mb-8 text-center space-y-2">
                            <div className="h-12 w-12 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-4 text-black">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Business Details</h1>
                            <p className="text-slate-500">
                                Tell us more about your services (optional).
                            </p>
                        </div>

                        <Card className="border-slate-200 shadow-sm bg-white">
                            <CardContent className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="business_name">Business Name</Label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="business_name"
                                            className="pl-10"
                                            placeholder="Your business name (optional)"
                                            value={formData.business_name || ''}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <textarea
                                        id="description"
                                        className="w-full min-h-[100px] px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all resize-none"
                                        placeholder="Describe your services and experience..."
                                        value={formData.description || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="years_experience">Years of Experience</Label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="years_experience"
                                                type="number"
                                                className="pl-10"
                                                placeholder="5"
                                                min={0}
                                                max={50}
                                                value={formData.years_experience || ''}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="hourly_rate">Hourly Rate (£)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400">£</span>
                                            <Input
                                                id="hourly_rate"
                                                type="number"
                                                className="pl-8"
                                                placeholder="25"
                                                min={0}
                                                step={0.5}
                                                value={formData.hourly_rate || ''}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="service_radius_km">Service Radius (km)</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="service_radius_km"
                                            type="number"
                                            className="pl-10"
                                            placeholder="10"
                                            min={1}
                                            max={100}
                                            value={formData.service_radius_km || 10}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        How far you&apos;re willing to travel for jobs.
                                    </p>
                                </div>

                                {/* Document Uploads */}
                                <div className="pt-6 border-t border-slate-200 space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <FileText className="h-5 w-5 text-slate-700" />
                                        <h3 className="font-semibold text-slate-900">Verification Documents</h3>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-4">
                                        Upload documents to verify your identity and business (optional but recommended)
                                    </p>

                                    {/* ID Document */}
                                    <div className="space-y-2">
                                        <Label htmlFor="id_document">Government ID / Passport</Label>
                                        {!uploadedFiles.idDocument ? (
                                            <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 cursor-pointer transition-colors bg-slate-50 hover:bg-slate-100">
                                                <div className="flex flex-col items-center gap-1">
                                                    <Upload className="h-5 w-5 text-slate-400" />
                                                    <span className="text-sm text-slate-500">Click to upload ID</span>
                                                </div>
                                                <input
                                                    id="id_document"
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    className="hidden"
                                                    onChange={(e) => handleFileUpload(e, 'idDocument')}
                                                />
                                            </label>
                                        ) : (
                                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-green-600" />
                                                    <span className="text-sm text-green-800">{uploadedFiles.idDocument.name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile('idDocument')}
                                                    className="text-green-600 hover:text-green-800"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Business License */}
                                    <div className="space-y-2">
                                        <Label htmlFor="business_license">Business License</Label>
                                        {!uploadedFiles.businessLicense ? (
                                            <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 cursor-pointer transition-colors bg-slate-50 hover:bg-slate-100">
                                                <div className="flex flex-col items-center gap-1">
                                                    <Upload className="h-5 w-5 text-slate-400" />
                                                    <span className="text-sm text-slate-500">Click to upload license</span>
                                                </div>
                                                <input
                                                    id="business_license"
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    className="hidden"
                                                    onChange={(e) => handleFileUpload(e, 'businessLicense')}
                                                />
                                            </label>
                                        ) : (
                                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-green-600" />
                                                    <span className="text-sm text-green-800">{uploadedFiles.businessLicense.name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile('businessLicense')}
                                                    className="text-green-600 hover:text-green-800"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Insurance Document */}
                                    <div className="space-y-2">
                                        <Label htmlFor="insurance_document">Insurance Certificate</Label>
                                        {!uploadedFiles.insuranceDocument ? (
                                            <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 cursor-pointer transition-colors bg-slate-50 hover:bg-slate-100">
                                                <div className="flex flex-col items-center gap-1">
                                                    <Upload className="h-5 w-5 text-slate-400" />
                                                    <span className="text-sm text-slate-500">Click to upload insurance</span>
                                                </div>
                                                <input
                                                    id="insurance_document"
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    className="hidden"
                                                    onChange={(e) => handleFileUpload(e, 'insuranceDocument')}
                                                />
                                            </label>
                                        ) : (
                                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-green-600" />
                                                    <span className="text-sm text-green-800">{uploadedFiles.insuranceDocument.name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile('insuranceDocument')}
                                                    className="text-green-600 hover:text-green-800"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Certifications (Multiple) */}
                                    <div className="space-y-2">
                                        <Label htmlFor="certifications">Professional Certifications</Label>
                                        <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 cursor-pointer transition-colors bg-slate-50 hover:bg-slate-100">
                                            <div className="flex flex-col items-center gap-1">
                                                <Upload className="h-5 w-5 text-slate-400" />
                                                <span className="text-sm text-slate-500">Click to upload certifications</span>
                                                <span className="text-xs text-slate-400">You can select multiple files</span>
                                            </div>
                                            <input
                                                id="certifications"
                                                type="file"
                                                accept="image/*,.pdf"
                                                multiple
                                                className="hidden"
                                                onChange={(e) => handleFileUpload(e, 'certifications')}
                                            />
                                        </label>
                                        {uploadedFiles.certifications.length > 0 && (
                                            <div className="space-y-2 mt-2">
                                                {uploadedFiles.certifications.map((file, index) => (
                                                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="h-4 w-4 text-green-600" />
                                                            <span className="text-sm text-green-800">{file.name}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFile('certifications', index)}
                                                            className="text-green-600 hover:text-green-800"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Step 4: Location */}
                {step === 4 && (
                    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500 mb-20">
                        <div className="mb-8 text-center space-y-2">
                            <div className="h-12 w-12 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-4 text-black">
                                <MapPin className="h-6 w-6" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your Location</h1>
                            <p className="text-slate-500">
                                Set your base location so customers can find you.
                            </p>
                        </div>

                        <Card className="border-slate-200 shadow-sm bg-white">
                            <CardContent className="p-6">
                                <GoogleMapsProvider>
                                    <LocationPicker
                                        onLocationSelect={handleLocationSelect}
                                        initialLocation={formData.location.latitude !== 0 ? formData.location : undefined}
                                        initialAddress={formData.address.street ? formData.address : undefined}
                                    />
                                </GoogleMapsProvider>
                            </CardContent>
                        </Card>
                    </div>
                )}

            </main>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 flex justify-center items-center z-40">
                <div className="container max-w-5xl flex justify-between items-center">
                    <div className="hidden md:block text-slate-500 text-sm">
                        {step === 1 && (formData.primary_service ? 'Great choice!' : 'Please select a service type.')}
                        {step === 2 && 'Enter your personal details.'}
                        {step === 3 && 'Business details are optional.'}
                        {step === 4 && (isStep4Valid ? 'Location set!' : 'Select your location on the map.')}
                    </div>

                    <Button
                        size="lg"
                        disabled={!canProceed() || isLoading}
                        className={cn(
                            "w-full md:w-auto min-w-[200px] text-base font-semibold transition-all duration-300",
                            !canProceed() ? "opacity-50" : "opacity-100"
                        )}
                        onClick={handleContinue}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating Account...
                            </>
                        ) : (
                            step === TOTAL_STEPS ? 'Create Account' : 'Continue'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
