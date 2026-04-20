/**
 * IN DEVELOPMENT — Session tracking feature.
 * Not production-ready. Requires further testing before deployment.
 * Requires S3-compatible storage (S3_SESSION_BUCKET) and optionally
 * a PostSignIn webhook for full device metadata capture.
 */
import { type NextRequest, NextResponse } from 'next/server'
import { UAParser } from 'ua-parser-js'
import { introspectToken } from '@/app/logto-kit/logic/utils'
import type { SessionMeta } from '@/app/logto-kit/logic/types'
import { debugLog, debugWarn, debugError } from '@/app/logto-kit/logic/debug'

export const runtime = 'nodejs'

function sanitizeIp(ip: string): string {
  const trimmed = ip.split(',')[0]?.trim() || ''
  if (/^[a-fA-F0-9.:]+$/.test(trimmed) && trimmed.length <= 45) {
    return trimmed
  }
  return ''
}

function extractIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const sanitized = sanitizeIp(forwarded)
    if (sanitized) return sanitized
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    const sanitized = sanitizeIp(realIp)
    if (sanitized) return sanitized
  }
  return ''
}

async function listSessionMetasFromS3(userId: string): Promise<SessionMeta[]> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucket = process.env.S3_SESSION_BUCKET || process.env.S3_BUCKET_NAME
  const rawEndpoint = process.env.S3_ENDPOINT

  if (!serviceRoleKey || !bucket || !rawEndpoint) return []

  const restBase = rawEndpoint.replace(/\/s3\/?$/, '')
  const prefix = `sessions/${userId}/`

  try {
    const listUrl = `${restBase}/object/list/${bucket}`
    const listRes = await fetch(listUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefix, limit: 100 }),
      cache: 'no-store',
    })

    if (!listRes.ok) {
      debugWarn(`[session-track] Failed to list S3 objects: HTTP ${listRes.status}`)
      return []
    }

    const objects = await listRes.json() as { name: string }[]
    const metas: SessionMeta[] = []

    await Promise.allSettled(objects.map(async (obj) => {
      const fileRes = await fetch(`${restBase}/object/${bucket}/${obj.name}`, {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
        cache: 'no-store',
      })
      if (fileRes.ok) {
        const meta = await fileRes.json() as SessionMeta
        metas.push(meta)
      }
    }))

    return metas
  } catch (err) {
    debugWarn('[session-track] S3 list failed:', err instanceof Error ? err.message : String(err))
    return []
  }
}

async function upsertSessionMeta(
  restBase: string,
  bucket: string,
  serviceRoleKey: string,
  meta: SessionMeta,
): Promise<boolean> {
  const key = `sessions/${meta.userId}/${meta.jti}.json`
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
    debugError(`[session-track] Failed to upsert: HTTP ${upsertRes.status}: ${errBody}`)
    return false
  }
  return true
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { accessToken, userId } = body as { accessToken?: string; userId?: string }

    if (!accessToken || !userId) {
      return NextResponse.json({ error: 'accessToken and userId are required' }, { status: 400 })
    }

    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
    }

    const introspection = await introspectToken(accessToken)
    if (!introspection.active) {
      return NextResponse.json({ error: 'Token is not active' }, { status: 401 })
    }
    if (introspection.sub !== userId) {
      return NextResponse.json({ error: 'Token subject does not match userId' }, { status: 401 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const bucket = process.env.S3_SESSION_BUCKET || process.env.S3_BUCKET_NAME
    const rawEndpoint = process.env.S3_ENDPOINT

    if (!serviceRoleKey || !bucket || !rawEndpoint) {
      debugWarn('[session-track] S3 config incomplete')
      return NextResponse.json({ ok: true, updated: false, reason: 'no_s3_config' })
    }

    const restBase = rawEndpoint.replace(/\/s3\/?$/, '')

    const ua = request.headers.get('user-agent') || ''
    const ip = extractIp(request)
    const parser = new UAParser(ua)
    const browserResult = parser.getBrowser()
    const osResult = parser.getOS()
    const deviceResult = parser.getDevice()

    const browserName = browserResult.name || null
    const osName = osResult.name || null
    const deviceType = deviceResult.type || null

    debugLog(`[session-track] UA: browser=${browserName}, os=${osName}, device=${deviceType}`)

    const metas = await listSessionMetasFromS3(userId)

    const matchedMeta = metas.find(m =>
      m.browser === browserName && m.os === osName && m.deviceType === deviceType
    )

    const now = new Date().toISOString()

    if (matchedMeta) {
      const updatedMeta: SessionMeta = { ...matchedMeta, lastActive: now }
      const ok = await upsertSessionMeta(restBase, bucket, serviceRoleKey, updatedMeta)
      if (ok) {
        debugLog(`[session-track] Updated lastActive for jti=${matchedMeta.jti.substring(0, 8)}, browser=${browserName}, os=${osName}`)
        return NextResponse.json({ ok: true, updated: true, jti: matchedMeta.jti })
      }
      return NextResponse.json({ error: 'Failed to store session meta' }, { status: 500 })
    }

    const jti = introspection.sid || introspection.jti

    if (!jti) {
      debugLog('[session-track] No S3 match, no jti from introspection — cannot create or update')
      return NextResponse.json({ ok: true, updated: false, reason: 'no_jti' })
    }

    debugLog(`[session-track] No fingerprint match — creating new meta for jti=${jti.substring(0, 8)} (heartbeat fallback for dev/no-webhook)`)

    const newMeta: SessionMeta = {
      jti,
      userId,
      browser: browserName,
      browserVersion: browserResult.version || null,
      os: osName,
      osVersion: osResult.version || null,
      deviceType,
      ip: ip || null,
      createdAt: now,
      lastActive: now,
    }

    const ok = await upsertSessionMeta(restBase, bucket, serviceRoleKey, newMeta)
    if (ok) {
      debugLog(`[session-track] Created meta for jti=${jti.substring(0, 8)}, browser=${browserName}, os=${osName}`)
      return NextResponse.json({ ok: true, updated: true, jti })
    }
    return NextResponse.json({ error: 'Failed to store session meta' }, { status: 500 })
  } catch (err) {
    debugError('[session-track] Error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}