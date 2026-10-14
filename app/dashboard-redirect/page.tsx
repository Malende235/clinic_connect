/**
 * /dashboard-redirect
 * 
 * Users who are already logged in (e.g., landing on /login while having
 * an active session) are sent here by middleware. We fetch their profile
 * and redirect to the right dashboard.
 */
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardRedirect() {
  const router = useRouter()

  useEffect(() => {
    async function go() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      router.replace(profile?.role === 'doctor' ? '/doctor' : '/patient')
    }
    go()
  }, [router])

  return (
    <main className="main-content" style={{textAlign:'center',paddingTop:'80px'}}>
      <span className="spinner" style={{borderTopColor:'var(--primary)',borderColor:'var(--border)',width:'32px',height:'32px',borderWidth:'3px'}}/>
      <p className="muted" style={{marginTop:'16px'}}>Redirecting…</p>
    </main>
  )
}
