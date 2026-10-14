import { createServiceClient } from './supabase/server'

export interface Profile {
  id: string
  name: string
  role: 'patient' | 'doctor'
  doctor_type: 'general' | 'specialist' | null
  specialty: string | null
}

export interface Message {
  id: number
  case_id: number
  sender_id: string | null
  is_system: boolean
  body: string
  created_at: string
  sender?: Profile | null
}

export interface Case {
  id: number
  patient_id: string
  subject: string
  status: 'new' | 'with_general' | 'forwarded' | 'closed'
  general_id: string | null
  specialist_id: string | null
  created_at: string
  updated_at: string
  patient?: Profile
  general?: Profile | null
  specialist?: Profile | null
  messages?: Message[]
}

/** Fetch a single fully-joined case by id. */
export async function getCase(caseId: number): Promise<Case | null> {
  const db = createServiceClient()

  const { data, error } = await db
    .from('cases')
    .select(`
      *,
      patient:profiles!cases_patient_id_fkey(*),
      general:profiles!cases_general_id_fkey(*),
      specialist:profiles!cases_specialist_id_fkey(*),
      messages(
        *,
        sender:profiles!messages_sender_id_fkey(*)
      )
    `)
    .eq('id', caseId)
    .order('created_at', { referencedTable: 'messages', ascending: true })
    .single()

  if (error || !data) return null
  return data as Case
}

/** Check if a user can see a case. */
export function canSee(profile: Profile, c: Case): boolean {
  if (profile.role === 'patient') return c.patient_id === profile.id
  if (profile.doctor_type === 'general')
    return c.status === 'new' || c.general_id === profile.id
  return c.specialist_id === profile.id
}

/** Add a message to a case. */
export async function addMessage(
  caseId: number,
  senderId: string | null,
  body: string,
  isSystem = false
): Promise<void> {
  const db = createServiceClient()
  await db.from('messages').insert({
    case_id: caseId,
    sender_id: senderId,
    body,
    is_system: isSystem,
  })
  // Touch updated_at
  await db
    .from('cases')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', caseId)
}

/** Get all cases visible to a user. */
export async function getCasesForUser(profile: Profile): Promise<Case[]> {
  const db = createServiceClient()

  let query = db
    .from('cases')
    .select(`
      *,
      patient:profiles!cases_patient_id_fkey(id,name),
      general:profiles!cases_general_id_fkey(id,name,specialty),
      specialist:profiles!cases_specialist_id_fkey(id,name,specialty),
      messages(id,body,created_at,is_system,sender_id)
    `)
    .order('updated_at', { ascending: false })

  if (profile.role === 'patient') {
    query = query.eq('patient_id', profile.id)
  } else if (profile.doctor_type === 'general') {
    query = query.or(`status.eq.new,general_id.eq.${profile.id}`)
  } else {
    query = query.eq('specialist_id', profile.id)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Case[]
}
