'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Fetch profile to know role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'doctor') {
      router.replace('/doctor')
    } else {
      router.replace('/patient')
    }
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
          <h1>Welcome back</h1>
          <p className="muted" style={{marginTop:'-8px',marginBottom:'8px'}}>Log in to your ClinicConnect account.</p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <button type="submit" style={{width:'100%',marginTop:'20px'}} disabled={loading}>
              {loading ? <span className="spinner"/> : 'Log in'}
            </button>
          </form>

          {error && <div className="msg err" role="alert">{error}</div>}

          <hr className="divider" />
          <p style={{textAlign:'center',margin:0,fontSize:'.9rem'}}>
            <Link href="/forgot">Forgot password?</Link>
            {' · '}
            <Link href="/signup">Create account</Link>
          </p>
        </div>
      </main>
    </>
  )
}
