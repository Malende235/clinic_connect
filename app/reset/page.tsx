'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase redirects here with a session token in the URL hash.
    // The SSR client automatically picks it up.
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password needs 8+ characters with a letter and a number.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.replace('/login'), 2000)
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
    </header>
  )

  if (success) {
    return (
      <>
        <Header/>
        <main className="main-content narrow">
          <div className="card" style={{textAlign:'center',padding:'48px 32px'}}>
            <div style={{fontSize:'3rem',marginBottom:'16px'}}>✅</div>
            <h1>Password updated!</h1>
            <p className="muted">Redirecting you to login…</p>
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
          <h1>Set new password</h1>
          {!ready && (
            <div className="msg warn">
              Waiting for the reset link to be verified. If nothing happens, try clicking the link in your email again.
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <label htmlFor="password">New password</label>
            <input id="password" type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="8+ chars, letter & number" disabled={!ready} />

            <label htmlFor="confirm">Confirm password</label>
            <input id="confirm" type="password" required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat your new password" disabled={!ready} />

            <button type="submit" style={{width:'100%',marginTop:'20px'}} disabled={loading || !ready}>
              {loading ? <span className="spinner"/> : 'Update password'}
            </button>
          </form>

          {error && <div className="msg err" role="alert">{error}</div>}
        </div>
      </main>
    </>
  )
}
