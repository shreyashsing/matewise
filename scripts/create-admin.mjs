#!/usr/bin/env node
/**
 * Provisions (or promotes) an admin account for the MateWise admin portal.
 *
 * There is no in-app "become admin" HTTP endpoint -- this script, run
 * locally with the service-role key, is the standing way admins get
 * created. Safe to re-run for additional admins later.
 *
 * Usage:
 *   node scripts/create-admin.mjs <email> [password]
 *
 * - If an auth user with that email already exists, it's just promoted
 *   (profiles.role = 'admin').
 * - Otherwise a new auth user is created (email pre-confirmed) with the
 *   given password, or a generated one if you didn't pass one -- printed
 *   once, never stored anywhere.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { randomBytes } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnvFile(path) {
    if (!existsSync(path)) return
    const content = readFileSync(path, 'utf-8')
    for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq === -1) continue
        const key = trimmed.slice(0, eq).trim()
        let value = trimmed.slice(eq + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
        }
        if (!(key in process.env)) process.env[key] = value
    }
}

loadEnvFile(resolve(__dirname, '..', '.env'))
loadEnvFile(resolve(__dirname, '..', '.env.local'))

function generatePassword() {
    return randomBytes(18).toString('base64').replace(/[+/=]/g, '').slice(0, 20)
}

async function main() {
    const [, , email, passwordArg] = process.argv
    if (!email) {
        console.error('Usage: node scripts/create-admin.mjs <email> [password]')
        process.exit(1)
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
        console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (checked .env and .env.local).')
        process.exit(1)
    }

    const supabaseAdmin = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })

    const normalizedEmail = email.toLowerCase().trim()

    // Find an existing auth user with this email, if any (paginated scan --
    // the admin API has no filter-by-email list endpoint).
    let existingUser = null
    for (let page = 1; page <= 20 && !existingUser; page++) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 })
        if (error) {
            console.error('Failed to list users:', error.message)
            process.exit(1)
        }
        existingUser = data.users.find((u) => u.email?.toLowerCase() === normalizedEmail)
        if (data.users.length < 200) break
    }

    let userId
    let generatedPassword = null

    if (existingUser) {
        userId = existingUser.id
        console.log(`Found existing account for ${normalizedEmail} (${userId}). Promoting to admin.`)
    } else {
        generatedPassword = passwordArg || generatePassword()
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password: generatedPassword,
            email_confirm: true,
            user_metadata: { role: 'admin' }
        })
        if (error) {
            console.error('Failed to create admin user:', error.message)
            process.exit(1)
        }
        userId = data.user.id
        console.log(`Created new auth user for ${normalizedEmail} (${userId}).`)
    }

    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({ id: userId, email: normalizedEmail, role: 'admin' }, { onConflict: 'id' })

    if (profileError) {
        console.error('Failed to set profiles.role = admin:', profileError.message)
        process.exit(1)
    }

    console.log(`\n✅ ${normalizedEmail} is now an admin.`)
    if (generatedPassword) {
        console.log(`   Password: ${generatedPassword}`)
        console.log('   (shown once -- store it somewhere safe, then change it after first login)')
    }
}

main()
