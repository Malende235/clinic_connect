import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/specialists — list verified specialists (general doctors only)
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).single()

  if (!profile || profile.doctor_type !== 'general') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: specialists } = await db
    .from('profiles')
    .select('id, name, specialty')
    .eq('doctor_type', 'specialist')
    .order('name')

  return NextResponse.json({ specialists: specialists ?? [] })
}
