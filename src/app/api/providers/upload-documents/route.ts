/**
 * Provider Document Upload API
 * POST /api/providers/upload-documents - Upload verification documents to Supabase storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import type { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
            return NextResponse.json({
                success: false,
                error: 'Unauthorized'
            } as ApiResponse, { status: 401 })
        }

        const formData = await request.formData()
        const uploadedUrls: Record<string, string | string[]> = {}

        // Upload ID Document
        const idDocument = formData.get('id_document') as File | null
        if (idDocument) {
            const fileName = `${user.id}/id_document_${Date.now()}.${idDocument.name.split('.').pop()}`
            const { data, error } = await supabase.storage
                .from('provider-documents')
                .upload(fileName, idDocument, {
                    contentType: idDocument.type,
                    upsert: false
                })

            if (error) {
                console.error('ID document upload error:', error)
            } else if (data) {
                const { data: urlData } = supabase.storage
                    .from('provider-documents')
                    .getPublicUrl(data.path)
                uploadedUrls.id_document_url = urlData.publicUrl
            }
        }

        // Upload Business License
        const businessLicense = formData.get('business_license') as File | null
        if (businessLicense) {
            const fileName = `${user.id}/business_license_${Date.now()}.${businessLicense.name.split('.').pop()}`
            const { data, error } = await supabase.storage
                .from('provider-documents')
                .upload(fileName, businessLicense, {
                    contentType: businessLicense.type,
                    upsert: false
                })

            if (error) {
                console.error('Business license upload error:', error)
            } else if (data) {
                const { data: urlData } = supabase.storage
                    .from('provider-documents')
                    .getPublicUrl(data.path)
                uploadedUrls.business_license_url = urlData.publicUrl
            }
        }

        // Upload Insurance Document
        const insuranceDocument = formData.get('insurance_document') as File | null
        if (insuranceDocument) {
            const fileName = `${user.id}/insurance_${Date.now()}.${insuranceDocument.name.split('.').pop()}`
            const { data, error } = await supabase.storage
                .from('provider-documents')
                .upload(fileName, insuranceDocument, {
                    contentType: insuranceDocument.type,
                    upsert: false
                })

            if (error) {
                console.error('Insurance document upload error:', error)
            } else if (data) {
                const { data: urlData } = supabase.storage
                    .from('provider-documents')
                    .getPublicUrl(data.path)
                uploadedUrls.insurance_document_url = urlData.publicUrl
            }
        }

        // Upload Certifications (Multiple)
        const certificationUrls: string[] = []
        let certIndex = 0
        while (true) {
            const certification = formData.get(`certification_${certIndex}`) as File | null
            if (!certification) break

            const fileName = `${user.id}/certification_${certIndex}_${Date.now()}.${certification.name.split('.').pop()}`
            const { data, error } = await supabase.storage
                .from('provider-documents')
                .upload(fileName, certification, {
                    contentType: certification.type,
                    upsert: false
                })

            if (error) {
                console.error(`Certification ${certIndex} upload error:`, error)
            } else if (data) {
                const { data: urlData } = supabase.storage
                    .from('provider-documents')
                    .getPublicUrl(data.path)
                certificationUrls.push(urlData.publicUrl)
            }

            certIndex++
        }

        if (certificationUrls.length > 0) {
            uploadedUrls.certification_urls = certificationUrls
        }

        // Set documents uploaded timestamp
        uploadedUrls.documents_uploaded_at = new Date().toISOString()

        return NextResponse.json({
            success: true,
            data: uploadedUrls,
            message: 'Documents uploaded successfully'
        } as ApiResponse)

    } catch (error) {
        console.error('Document upload error:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to upload documents'
        } as ApiResponse, { status: 500 })
    }
}
