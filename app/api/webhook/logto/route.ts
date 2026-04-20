import { type NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { UAParser } from 'ua-parser-js'
import { debugLog, debugWarn, debugError } from '@/app/logto-kit/logic/debug'

export const runtime = 'nodejs'

interface WebhookPayload {
  hookId: string
  event: string
  createdAt: string
  sessionId?: string
  userAgent?: string
  userIp?: string
  userId?: string
  applicationId?: string
}

function verifySignature(rawBody: string, signature: string | null, signingKey: string): boolean {
  if (!signature || !signingKey) return false
  if (signature.length !== 64) return false
  const hmac = createHmac('sha256', signingKey)
  hmac.update(rawBody)
  const computed = hmac.digest('hex')
  return timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
}

function sanitizeIp(ip: string): string {
  const trimmed = ip.split(',')[0]?.trim() || ''
  if (/^[a-fA-F0-9.:]+$/.test(trimmed) && trimmed.length <= 45) {
    return trimmed
  }
  return ''
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('logto-signature-sha-256')
    const signingKey = process.env.LOGTO_WEBHOOK_SIGNING_KEY || ''

    if (signingKey && !verifySignature(rawBody, signature, signingKey)) {
      debugWarn('[webhook-logto] Signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let payload: WebhookPayload
    try {
      payload = JSON.parse(rawBody) as WebhookPayload
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (payload.event !== 'PostSignIn') {
      debugLog(`[webhook-logto] Ignoring event: ${payload.event}`)
      return NextResponse.json({ ok: true, event: payload.event })
    }

    const { sessionId, userAgent, userIp, userId, createdAt } = payload

    if (!sessionId || !userId) {
      debugWarn('[webhook-logto] Missing sessionId or userId in payload')
      return NextResponse.json({ error: 'Missing sessionId or userId' }, { status: 400 })
    }

    const ip = sanitizeIp(userIp || '')
    const ua = userAgent || ''

    const parser = new UAParser(ua)
    const browserResult = parser.getBrowser()
    const osResult = parser.getOS()
    const deviceResult = parser.getDevice()

    const browser = browserResult.name || null
    const browserVersion = browserResult.version || null
    const os = osResult.name || null
    const osVersion = osResult.version || null
    const deviceType = deviceResult.type || null

    debugLog(`[webhook-logto] PostSignIn: userId=${userId.substring(0, 8)}, sessionId=${sessionId.substring(0, 8)}, browser=${browser}, os=${os}`)

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const bucket = process.env.S3_SESSION_BUCKET || process.env.S3_BUCKET_NAME
    const restBase = process.env.S3_ENDPOINT?.replace(/\/s3\/?$/, '')

    if (!serviceRoleKey || !bucket || !restBase) {
      debugWarn('[webhook-logto] S3 config incomplete, skipping storage')
      return NextResponse.json({ ok: true, stored: false })
    }

    const key = `sessions/${userId}/${sessionId}.json`
    const meta = {
      jti: sessionId,
      userId,
      browser,
      browserVersion,
      os,
      osVersion,
      deviceType,
      ip: ip || null,
      createdAt: createdAt || new Date().toISOString(),
      lastActive: createdAt || new Date().toISOString(),
    }

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
      debugError(`[webhook-logto] Failed to store meta: HTTP ${upsertRes.status}: ${errBody}`)
      return NextResponse.json({ error: 'Storage failed' }, { status: 500 })
    }

    debugLog(`[webhook-logto] Stored meta: sessions/${userId}/${sessionId}.json`)
    return NextResponse.json({ ok: true, stored: true })
  } catch (err) {
    debugError('[webhook-logto] Error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}