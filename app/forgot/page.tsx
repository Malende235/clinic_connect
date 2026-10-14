'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  const Header = () => (
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
  )

  if (sent) {
    return (
      <>
        <Header/>
        <main className="main-content narrow">
          <div className="card" style={{textAlign:'center',padding:'48px 32px'}}>
            <div style={{fontSize:'3rem',marginBottom:'16px'}}>📩</div>
            <h1>Check your email</h1>
            <p className="muted">If that email is registered, we sent a reset link. It expires in 1 hour.</p>
            <Link href="/login" className="btn" style={{marginTop:'20px'}}>Back to login</Link>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header/>
      <main className="main-content narrow">
        <div className="card">
          <h1>Forgot password?</h1>
          <p className="muted" style={{marginTop:'-8px',marginBottom:'8px'}}>Enter your email and we'll send a reset link.</p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
            <button type="submit" style={{width:'100%',marginTop:'20px'}} disabled={loading}>
              {loading ? <span className="spinner"/> : 'Send reset link'}
            </button>
          </form>

          {error && <div className="msg err" role="alert">{error}</div>}

          <hr className="divider"/>
          <p style={{textAlign:'center',margin:0,fontSize:'.9rem'}}>
            <Link href="/login">Back to login</Link>
          </p>
        </div>
      </main>
    </>
  )
}
