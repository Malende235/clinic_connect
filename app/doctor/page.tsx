'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Profile { id: string; name: string; specialty: string | null; doctor_type: string | null }

interface Message {
  id: number
  sender_id: string | null
  is_system: boolean
  body: string
  created_at: string
  sender?: { name: string; role: string } | null
}

interface CaseItem {
  id: number
  subject: string
  status: 'new' | 'with_general' | 'forwarded' | 'closed'
  updated_at: string
  patient?: { id: string; name: string }
  general?: Profile | null
  specialist?: Profile | null
}

interface FullCase extends CaseItem {
  patient_id: string
  general_id: string | null
  specialist_id: string | null
  messages: Message[]
}

const STATUS_LABEL: Record<string, string> = {
  new: 'Waiting for GP',
  with_general: 'With general doctor',
  forwarded: 'With specialist',
  closed: 'Closed',
}

const STATUS_BADGE: Record<string, string> = {
  new: 'badge-new',
  with_general: 'badge-general',
  forwarded: 'badge-forwarded',
  closed: 'badge-closed',
}

async function apiCall(path: string, method = 'GET', body?: object) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Request failed')
  return data
}

export default function DoctorDashboard() {
  const router = useRouter()
  const [me, setMe] = useState<Profile & { role: string } | null>(null)
  const [cases, setCases] = useState<CaseItem[]>([])
  const [active, setActive] = useState<FullCase | null>(null)
  const [loadingCases, setLoadingCases] = useState(true)

  // Reply / actions
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [actionError, setActionError] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [closing, setClosing] = useState(false)

  // Forward form
  const [specialists, setSpecialists] = useState<{ id: string; name: string; specialty: string }[]>([])
  const [selectedSpec, setSelectedSpec] = useState('')
  const [forwardNote, setForwardNote] = useState('')
  const [forwarding, setForwarding] = useState(false)

  // Auth + profile
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('id,name,specialty,doctor_type,role')
        .eq('id', user.id)
        .single()
      if (!profile || profile.role !== 'doctor') { router.replace('/login'); return }
      setMe(profile)
    })
  }, [router])

  const loadCases = useCallback(async () => {
    setLoadingCases(true)
    try {
      const { cases: c } = await apiCall('/api/cases')
      setCases(c)
    } catch { /* ignore */ }
    setLoadingCases(false)
  }, [])

  useEffect(() => { if (me) loadCases() }, [me, loadCases])

  async function openCase(c: CaseItem) {
    setActionError('')
    const { case: full } = await apiCall(`/api/cases/${c.id}`)
    setActive(full)
    setReplyText('')
    setForwardNote('')

    // Load specialists if this is a general doctor who can forward
    if (me?.doctor_type === 'general' && full.status === 'with_general' && full.general_id === me.id) {
      try {
        const { specialists: s } = await apiCall('/api/specialists')
        setSpecialists(s)
        setSelectedSpec(s[0]?.id ?? '')
      } catch { setSpecialists([]) }
    }
  }

  async function performAction(action: string, body?: object) {
    setActionError('')
    try {
      const { case: c } = await apiCall(`/api/cases/${active!.id}?action=${action}`, 'POST', body ?? {})
      setActive(c)
      await loadCases()
    } catch (err: any) {
      setActionError(err.message)
    }
  }

  async function handleClaim() {
    setClaiming(true)
    await performAction('claim')
    setClaiming(false)
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    setReplying(true)
    await performAction('messages', { text: replyText })
    setReplyText('')
    setReplying(false)
  }

  async function handleForward() {
    setForwarding(true)
    await performAction('forward', { specialistId: selectedSpec, note: forwardNote })
    setForwarding(false)
  }

  async function handleClose() {
    setClosing(true)
    await performAction('close')
    setClosing(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const isGeneral = me?.doctor_type === 'general'
  const isMine = active ? (active.general_id === me?.id || active.specialist_id === me?.id) : false
  const canClaim = isGeneral && active?.status === 'new'
  const canReply = isMine && active?.status !== 'closed'
  const canForward = isGeneral && active?.general_id === me?.id && active?.status === 'with_general'

  const headingTitle = isGeneral ? 'New & assigned cases' : 'Cases forwarded to me'

  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">
          <span className="brand-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </span>
          ClinicConnect
        </Link>
        <nav className="site-nav">
          {me && (
            <span className="hello">
              🩺 Dr {me.name}{me.specialty ? ` — ${me.specialty}` : ''}
            </span>
          )}
          <button className="btn-alt btn btn-sm" style={{marginTop:0}} onClick={handleLogout}>Log out</button>
        </nav>
      </header>

      <main className="main-content" style={{
        display: 'grid',
        gridTemplateColumns: active ? '1fr 1.6fr' : '1fr',
        gap: '20px',
        maxWidth: '1200px',
      }}>
        {/* Left: case list */}
        <div className="card" style={{alignSelf:'start',position:'sticky',top:'80px'}}>
          <h2 style={{marginBottom:'16px'}}>{headingTitle}</h2>

          {loadingCases ? (
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              {[1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:'68px'}}/>)}
            </div>
          ) : cases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🗂️</div>
              <p>No cases right now. Check back soon.</p>
            </div>
          ) : (
            <div className="case-list">
              {cases.map(c => (
                <button
                  key={c.id}
                  className={`case-item ${active?.id === c.id ? 'active' : ''}`}
                  onClick={() => openCase(c)}
                >
                  <div className="case-item-subject">{c.subject}</div>
                  <div className="case-item-meta">
                    {c.patient && (
                      <span className="case-item-patient">👤 {c.patient.name}</span>
                    )}
                    <span className={`badge ${STATUS_BADGE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                    <span className="case-item-time">{new Date(c.updated_at).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: case detail */}
        {active && (
          <div>
            <div className="card">
              {/* Header */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <h2 style={{marginBottom:'6px'}}>{active.subject}</h2>
                  <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                    <span className={`badge ${STATUS_BADGE[active.status]}`}>{STATUS_LABEL[active.status]}</span>
                    {active.patient && <span className="muted" style={{fontSize:'.82rem'}}>Patient: {active.patient.name}</span>}
                    {active.specialist && <span className="muted" style={{fontSize:'.82rem'}}>Specialist: Dr {active.specialist.name}</span>}
                  </div>
                </div>
                <button className="btn-alt btn btn-sm" style={{marginTop:0}} onClick={()=>setActive(null)}>✕</button>
              </div>

              {/* Thread */}
              <div className="thread">
                {active.messages?.map(m => (
                  <div key={m.id} className={`bubble ${m.is_system ? 'sys' : m.sender_id === me?.id ? 'mine' : ''}`}>
                    {!m.is_system && (
                      <div className="bubble-who">
                        {m.sender ? `${m.sender.name}${m.sender.role === 'doctor' ? ' (Doctor)' : ''}` : 'Unknown'}
                      </div>
                    )}
                    {m.is_system && <div className="bubble-who">📋 Update</div>}
                    <div className="bubble-body">
                      <p className="bubble-text">{m.body}</p>
                    </div>
                    <div className="bubble-when">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>

              {actionError && <div className="msg err" role="alert">{actionError}</div>}

              {/* Claim button */}
              {canClaim && (
                <button
                  style={{width:'100%'}}
                  onClick={handleClaim}
                  disabled={claiming}
                >
                  {claiming ? <><span className="spinner"/> Taking case…</> : '✋ Take this case'}
                </button>
              )}

              {/* Reply form */}
              {canReply && (
                <>
                  <hr className="divider" style={{margin:'12px 0'}}/>
                  <form onSubmit={handleReply}>
                    <label htmlFor="rt">Reply to patient</label>
                    <textarea id="rt" rows={3} required value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder="Write your medical reply…" />
                    <button type="submit" disabled={replying} style={{width:'100%'}}>
                      {replying ? <><span className="spinner"/> Sending…</> : '💬 Send reply'}
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* Forward to specialist */}
            {canForward && (
              <div className="card">
                <h2>Forward to a specialist</h2>
                {specialists.length === 0 ? (
                  <div className="msg warn">No verified specialists registered yet.</div>
                ) : (
                  <>
                    <label htmlFor="sp">Specialist</label>
                    <select id="sp" value={selectedSpec} onChange={e=>setSelectedSpec(e.target.value)}>
                      {specialists.map(s => (
                        <option key={s.id} value={s.id}>Dr {s.name} — {s.specialty}</option>
                      ))}
                    </select>

                    <label htmlFor="fnote">Note for the specialist (optional)</label>
                    <textarea id="fnote" rows={2} value={forwardNote} onChange={e=>setForwardNote(e.target.value)} placeholder="Any context the specialist should know…" />

                    <button
                      className="btn-alt btn"
                      style={{width:'100%'}}
                      onClick={handleForward}
                      disabled={forwarding}
                    >
                      {forwarding ? <><span className="spinner" style={{borderTopColor:'var(--primary)'}}/> Forwarding…</> : '→ Forward case'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Close case */}
            {canReply && (
              <div className="card" style={{padding:'16px 20px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
                  <span style={{fontSize:'.9rem',color:'var(--muted)'}}>Done with this case?</span>
                  <button
                    className="btn-danger btn btn-sm"
                    style={{marginTop:0}}
                    onClick={handleClose}
                    disabled={closing}
                  >
                    {closing ? <><span className="spinner" style={{borderTopColor:'var(--danger-fg)'}}/> Closing…</> : '🔒 Close case'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}
