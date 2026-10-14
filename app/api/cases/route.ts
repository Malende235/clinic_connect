import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getCasesForUser, addMessage } from '@/lib/cases'

async function getProfile(userId: string) {
  const db = createServiceClient()
  const { data } = await db.from('profiles').select('*').eq('id', userId).single()
  return data
}

// GET /api/cases — list cases for the current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await getProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  try {
    const cases = await getCasesForUser(profile)
    return NextResponse.json({ cases })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/cases — create a new case (patients only)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await getProfile(user.id)
  if (!profile || profile.role !== 'patient') {
    return NextResponse.json({ error: 'Only patients can create cases.' }, { status: 403 })
  }

  const body = await req.json()
  const subject = (body.subject ?? '').trim().slice(0, 120)
  const text = (body.text ?? '').trim()

  if (!subject || !text) {
    return NextResponse.json({ error: 'Add a subject and describe your problem.' }, { status: 400 })
  }

  const db = createServiceClient()

  const { data: newCase, error } = await db
    .from('cases')
    .insert({ patient_id: user.id, subject })
    .select()
    .single()

  if (error || !newCase) {
    return NextResponse.json({ error: 'Failed to create case.' }, { status: 500 })
  }

  await addMessage(newCase.id, user.id, text)

  // Re-fetch full case
  const { getCase } = await import('@/lib/cases')
  const fullCase = await getCase(newCase.id)

  return NextResponse.json({ case: fullCase }, { status: 201 })
}
