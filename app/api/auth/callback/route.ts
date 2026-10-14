import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * /api/auth/callback
 *
 * Supabase redirects here after:
 *   - Email verification  (type=signup)
 *   - Magic link login    (type=magiclink)
 *   - Password reset      (type=recovery)
 *
 * We exchange the code for a session and redirect to the right page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') // 'signup' | 'recovery' | 'magiclink'
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=verification_failed`)
    }

    // After email verification, go to dashboard-redirect (will pick role)
    if (type === 'signup' || type === 'magiclink') {
      response.headers.set('location', `${origin}/dashboard-redirect`)
    }

    // After password reset, go to reset page
    if (type === 'recovery') {
      response.headers.set('location', `${origin}/reset`)
    }

    return response
  }

  // No code — something went wrong
  return NextResponse.redirect(`${origin}/login?error=no_code`)
}
