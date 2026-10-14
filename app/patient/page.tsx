'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ---- Types (simplified for client use) ----
interface CaseItem {
  id: number
  subject: string
  status: 'new' | 'with_general' | 'forwarded' | 'closed'
  updated_at: string
  messages?: { body: string; created_at: string }[]
}

interface Message {
  id: number
  sender_id: string | null
  is_system: boolean
  body: string
  created_at: string
  sender?: { name: string; role: string } | null
}

interface FullCase extends CaseItem {
  messages: Message[]
  general?: { id: string; name: string; specialty: string } | null
  specialist?: { id: string; name: string; specialty: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  new: 'Waiting for a doctor',
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

export default function PatientDashboard() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [cases, setCases] = useState<CaseItem[]>([])
  const [active, setActive] = useState<FullCase | null>(null)
  const [loadingCases, setLoadingCases] = useState(true)

  // New case form
  const [subject, setSubject] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Reply form
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [replyError, setReplyError] = useState('')
  const [closing, setClosing] = useState(false)

  // Auth check
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)
    })
    supabase.from('profiles').select('name').then(({ data }) => {
      if (data?.[0]) setUserName(data[0].name)
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

  useEffect(() => { loadCases() }, [loadCases])

  async function openCase(c: CaseItem) {
    const { case: full } = await apiCall(`/api/cases/${c.id}`)
    setActive(full)
    setReplyError('')
  }

  async function submitCase(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      const { case: c } = await apiCall('/api/cases', 'POST', { subject, text: details })
      setSubject(''); setDetails('')
      await loadCases()
      setActive(c)
    } catch (err: any) {
      setFormError(err.message)
    }
    setSubmitting(false)
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    setReplyError('')
    setReplying(true)
    try {
      const { case: c } = await apiCall(`/api/cases/${active!.id}?action=messages`, 'POST', { text: replyText })
      setReplyText('')
      setActive(c)
      await loadCases()
    } catch (err: any) { setReplyError(err.message) }
    setReplying(false)
  }

  async function closeCase() {
    setClosing(true)
    try {
      const { case: c } = await apiCall(`/api/cases/${active!.id}?action=close`, 'POST')
      setActive(c)
      await loadCases()
    } catch (err: any) { setReplyError(err.message) }
    setClosing(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

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
          {userName && <span className="hello">👤 {userName}</span>}
          <button className="btn-alt btn btn-sm" style={{marginTop:0}} onClick={handleLogout}>Log out</button>
        </nav>
      </header>

      <main className="main-content" style={{display:'grid',gridTemplateColumns:active?'1fr 1.5fr':'1fr',gap:'20px',maxWidth:'1200px'}}>
        {/* Left column */}
        <div>
          {/* New case form */}
          <div className="card">
            <h2>Describe your problem</h2>
            <form onSubmit={submitCase}>
              <label htmlFor="sub">Subject</label>
              <input id="sub" required maxLength={120} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Persistent headache for 3 days" />

              <label htmlFor="details">Details</label>
              <textarea id="details" rows={5} required value={details} onChange={e=>setDetails(e.target.value)} placeholder="Describe your symptoms, how long they've lasted, and any medicine you've taken…" />

              <button type="submit" style={{width:'100%'}} disabled={submitting}>
                {submitting ? <><span className="spinner"/> Sending…</> : '📤 Send to a doctor'}
              </button>
            </form>
            {formError && <div className="msg err" role="alert">{formError}</div>}
            <p className="muted" style={{marginTop:'12px',marginBottom:0,fontSize:'.82rem'}}>⚠️ Not for emergencies. Call your local emergency number if in danger.</p>
          </div>

          {/* Case list */}
          <div className="card">
            <h2>My cases</h2>
            {loadingCases ? (
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                {[1,2,3].map(i=><div key={i} className="skeleton" style={{height:'64px'}}/>)}
              </div>
            ) : cases.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <p>No cases yet. Describe a problem above to get started.</p>
              </div>
            ) : (
              <div className="case-list">
                {cases.map(c=>(
                  <button
                    key={c.id}
                    className={`case-item ${active?.id === c.id ? 'active' : ''}`}
                    onClick={()=>openCase(c)}
                  >
                    <div className="case-item-subject">{c.subject}</div>
                    <div className="case-item-meta">
                      <span className={`badge ${STATUS_BADGE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                      <span className="case-item-time">{new Date(c.updated_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — case detail */}
        {active && (
          <div className="card" style={{position:'sticky',top:'80px',alignSelf:'start'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px',flexWrap:'wrap'}}>
              <div>
                <h2 style={{marginBottom:'6px'}}>{active.subject}</h2>
                <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                  <span className={`badge ${STATUS_BADGE[active.status]}`}>{STATUS_LABEL[active.status]}</span>
                  {active.general && <span className="muted" style={{fontSize:'.82rem'}}>GP: Dr {active.general.name}</span>}
                  {active.specialist && <span className="muted" style={{fontSize:'.82rem'}}>Specialist: Dr {active.specialist.name} ({active.specialist.specialty})</span>}
                </div>
              </div>
              <button className="btn-alt btn btn-sm" style={{marginTop:0}} onClick={()=>setActive(null)}>✕ Close</button>
            </div>

            {/* Thread */}
            <div className="thread">
              {active.messages?.map(m=>(
                <div key={m.id} className={`bubble ${m.is_system?'sys':m.sender_id===userId?'mine':''}`}>
                  {!m.is_system && (
                    <div className="bubble-who">
                      {m.sender ? `${m.sender.name}${m.sender.role==='doctor'?' (Doctor)':''}` : 'Unknown'}
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

            {active.status !== 'closed' && (
              <>
                <hr className="divider" style={{margin:'8px 0'}}/>
                <form onSubmit={sendReply} style={{marginBottom:'10px'}}>
                  <label htmlFor="rt">Reply</label>
                  <textarea id="rt" rows={3} required value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder="Type your reply…" />
                  <button type="submit" disabled={replying} style={{width:'100%'}}>
                    {replying ? <><span className="spinner"/> Sending…</> : '💬 Send reply'}
                  </button>
                </form>
                <button className="btn-danger btn" style={{width:'100%',marginTop:'8px'}} onClick={closeCase} disabled={closing}>
                  {closing ? <><span className="spinner" style={{borderTopColor:'var(--danger-fg)'}}/> Closing…</> : '🔒 Close case'}
                </button>
              </>
            )}

            {replyError && <div className="msg err" role="alert">{replyError}</div>}
          </div>
        )}
      </main>
    </>
  )
}
