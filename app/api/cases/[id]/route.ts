import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getCase, canSee, addMessage } from '@/lib/cases'

type Params = { params: Promise<{ id: string }> }

async function getProfile(userId: string) {
  const db = createServiceClient()
  const { data } = await db.from('profiles').select('*').eq('id', userId).single()
  return data
}

async function auth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { user: null, profile: null }
  const profile = await getProfile(user.id)
  return { user, profile }
}

// GET /api/cases/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { user, profile } = await auth()
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const c = await getCase(Number(id))
  if (!c || !canSee(profile, c)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ case: c })
}

// POST /api/cases/[id] — route to sub-actions via ?action=
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const caseId = Number(id)
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') ?? ''

  const { user, profile } = await auth()
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const c = await getCase(caseId)
  if (!c || !canSee(profile, c)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (c.status === 'closed') return NextResponse.json({ error: 'This case is closed.' }, { status: 400 })

  const db = createServiceClient()
  const body = await req.json().catch(() => ({}))

  const isMine =
    profile.role === 'patient'
      ? c.patient_id === profile.id
      : c.general_id === profile.id || c.specialist_id === profile.id

  // ---------- claim ----------
  if (action === 'claim' && profile.doctor_type === 'general') {
    const { count } = await db
      .from('cases')
      .update({ status: 'with_general', general_id: user.id })
      .eq('id', caseId)
      .eq('status', 'new')
      .select('id', { count: 'exact', head: true })

    if (!count) return NextResponse.json({ error: 'This case was already taken.' }, { status: 409 })
    await addMessage(caseId, null, `Dr ${profile.name} (general doctor) took your case.`, true)
    return NextResponse.json({ case: await getCase(caseId) })
  }

  // ---------- messages ----------
  if (action === 'messages') {
    if (!isMine) return NextResponse.json({ error: 'Take the case first to reply.' }, { status: 403 })
    const text = (body.text ?? '').trim()
    if (!text) return NextResponse.json({ error: 'Write a message.' }, { status: 400 })
    await addMessage(caseId, user.id, text)
    return NextResponse.json({ case: await getCase(caseId) })
  }

  // ---------- forward ----------
  if (action === 'forward' && profile.doctor_type === 'general') {
    const specId = body.specialistId
    if (!specId) return NextResponse.json({ error: 'Choose a specialist.' }, { status: 400 })

    const { data: spec } = await db
      .from('profiles')
      .select('*')
      .eq('id', specId)
      .eq('doctor_type', 'specialist')
      .single()

    if (!spec) return NextResponse.json({ error: 'Choose a specialist.' }, { status: 400 })

    const { count } = await db
      .from('cases')
      .update({ status: 'forwarded', specialist_id: specId })
      .eq('id', caseId)
      .eq('general_id', user.id)
      .eq('status', 'with_general')
      .select('id', { count: 'exact', head: true })

    if (!count) return NextResponse.json({ error: 'You cannot forward this case.' }, { status: 403 })

    const note = (body.note ?? '').trim()
    const line = `Forwarded to Dr ${spec.name} (${spec.specialty}).` + (note ? ` Note: ${note}` : '')
    await addMessage(caseId, null, line, true)
    return NextResponse.json({ case: await getCase(caseId) })
  }

  // ---------- close ----------
  if (action === 'close') {
    if (!isMine) return NextResponse.json({ error: 'Only the patient or assigned doctor can close this case.' }, { status: 403 })
    await db.from('cases').update({ status: 'closed' }).eq('id', caseId)
    await addMessage(caseId, null, `Case closed by ${profile.name}.`, true)
    return NextResponse.json({ case: await getCase(caseId) })
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
}
