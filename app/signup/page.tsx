'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Role = 'patient' | 'doctor'
type DoctorType = 'general' | 'specialist'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('patient')
  const [doctorType, setDoctorType] = useState<DoctorType>('general')
  const [specialty, setSpecialty] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (name.trim().length < 2) { setError('Enter your full name.'); return }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password needs 8+ characters with a letter and a number.')
      return
    }
    if (role === 'doctor' && doctorType === 'specialist' && !specialty.trim()) {
      setError('Specialists must enter a specialty.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Build metadata to be picked up by the DB trigger + profile upsert
    const meta = {
      name: name.trim(),
      role,
      ...(role === 'doctor' ? {
        doctor_type: doctorType,
        specialty: doctorType === 'specialist' ? specialty.trim() : 'General practice',
      } : {}),
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: meta,
        emailRedirectTo: `${window.location.origin}/verify-callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Upsert profile with full details (trigger may have already created a stub)
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name: meta.name,
        role: meta.role,
        ...(role === 'doctor' ? {
          doctor_type: meta.doctor_type,
          specialty: meta.specialty,
        } : {}),
      })
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <>
        <header className="site-header">
          <Link className="brand" href="/"><span className="brand-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </span>ClinicConnect</Link>
        </header>
        <main className="main-content narrow">
          <div className="card" style={{textAlign:'center',padding:'48px 32px'}}>
            <div style={{fontSize:'3rem',marginBottom:'16px'}}>📧</div>
            <h1 style={{marginBottom:'12px'}}>Check your email</h1>
            <p className="muted">
              We sent a verification link to <strong>{email}</strong>.
              Click it to activate your account, then log in.
            </p>
            <Link href="/login" className="btn" style={{marginTop:'24px'}}>Go to login</Link>
          </div>
        </main>
      </>
    )
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
          <Link href="/login">Log in</Link>
          <Link href="/signup">Sign up</Link>
        </nav>
      </header>

      <main className="main-content narrow">
        <div className="card">
          <h1>Create account</h1>
          <p className="muted" style={{marginTop:'-8px',marginBottom:'8px'}}>Join ClinicConnect in seconds.</p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="name">Full name</label>
            <input id="name" required autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Jane Doe" />

            <label htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />

            <label htmlFor="password">Password</label>
            <input id="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="8+ chars, letter & number" />

            <label htmlFor="role">I am a</label>
            <select id="role" value={role} onChange={e=>setRole(e.target.value as Role)}>
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
            </select>

            {role === 'doctor' && (
              <>
                <label htmlFor="dtype">Doctor type</label>
                <select id="dtype" value={doctorType} onChange={e=>setDoctorType(e.target.value as DoctorType)}>
                  <option value="general">General doctor (GP)</option>
                  <option value="specialist">Specialist</option>
                </select>

                {doctorType === 'specialist' && (
                  <>
                    <label htmlFor="spec">Specialty (e.g. Cardiology)</label>
                    <input id="spec" value={specialty} onChange={e=>setSpecialty(e.target.value)} placeholder="Cardiology, Neurology…" />
                  </>
                )}
              </>
            )}

            <button type="submit" style={{width:'100%',marginTop:'20px'}} disabled={loading}>
              {loading ? <span className="spinner"/> : 'Create account'}
            </button>
          </form>

          {error && <div className="msg err" role="alert">{error}</div>}

          <hr className="divider" />
          <p style={{textAlign:'center',margin:0,fontSize:'.9rem'}}>
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </main>
    </>
  )
}
