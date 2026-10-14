import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protect dashboard routes
  if (
    (pathname.startsWith('/patient') || pathname.startsWith('/doctor')) &&
    !user
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect logged-in users away from auth pages
  if (
    user &&
    (pathname === '/login' || pathname === '/signup')
  ) {
    // We don't know the role here without a DB hit; redirect to a
    // lightweight redirect page that checks role client-side.
    return NextResponse.redirect(new URL('/dashboard-redirect', request.url))
  }

  return supabaseResponse
}

export const proxyConfig = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
