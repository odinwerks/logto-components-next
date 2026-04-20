import { type NextRequest, NextResponse } from 'next/server'
import { introspectToken } from '@/app/logto-kit/logic/utils'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { accessToken, userId } = body as { accessToken?: string; userId?: string }

    if (!accessToken || !userId) {
      return NextResponse.json({ error: 'accessToken and userId are required' }, { status: 400 })
    }

    const introspection = await introspectToken(accessToken)
    if (!introspection.active) {
      return NextResponse.json({ error: 'Token is not active' }, { status: 401 })
    }
    if (introspection.sub !== userId) {
      return NextResponse.json({ error: 'Token subject does not match userId' }, { status: 401 })
    }

    const jti = introspection.sid || introspection.jti
    if (!jti) {
      return NextResponse.json({ ok: true, updated: false, reason: 'no_jti' })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const bucket = process.env.S3_SESSION_BUCKET || process.env.S3_BUCKET_NAME
    const restBase = process.env.S3_ENDPOINT?.replace(/\/s3\/?$/, '')

    if (!serviceRoleKey || !bucket || !restBase) {
      return NextResponse.json({ ok: true, updated: false, reason: 'no_s3_config' })
    }

    const now = new Date().toISOString()
    const key = `sessions/${userId}/${jti}.json`

    let existing: Record<string, unknown> = {}
    try {
      const getRes = await fetch(`${restBase}/object/${bucket}/${key}`, {
        headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey },
        cache: 'no-store',
      })
      if (getRes.ok) existing = await getRes.json()
    } catch {}

    const meta = { ...existing, jti, lastActive: now }

    const upsertRes = await fetch(`${restBase}/object/${bucket}/${key}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': 'application/json',
        'x-upsert': 'true',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
      body: JSON.stringify(meta),
      cache: 'no-store',
    })

    if (!upsertRes.ok) {
      const errBody = await upsertRes.text().catch(() => upsertRes.statusText)
      console.error(`[session-track] Failed to upsert: HTTP ${upsertRes.status}: ${errBody}`)
      return NextResponse.json({ error: 'Failed to store session meta' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, updated: true, jti })
  } catch (err) {
    console.error('[session-track] Error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}