import { type NextRequest, NextResponse } from 'next/server'

import { uploadAvatar } from '@/app/logto-kit/logic/actions'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const result = await uploadAvatar(formData)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    const status = message.startsWith('UNAUTHORIZED') ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
