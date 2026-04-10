import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Route redirects: old paths → new pillar-based paths
const REDIRECTS: Record<string, string> = {
  '/initiatives': '/portfolio',
  '/discovery': '/landscape',
  '/user-journey': '/vision/audiences',
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle route redirects for old paths
  const redirectTo = REDIRECTS[pathname];
  if (redirectTo) {
    return NextResponse.redirect(new URL(redirectTo, request.url), 308);
  }

  // Public paths that don't require authentication
  const publicPaths = ['/auth/signin', '/api/auth', '/api', '/share', '/onboarding', '/privacy', '/terms'];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Allow public assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    isPublicPath
  ) {
    return NextResponse.next();
  }

  // Check for JWT token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Unauthenticated: allow root path (shows landing page), redirect others to sign-in
  if (!token) {
    if (pathname === '/') return NextResponse.next();
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If user hasn't completed onboarding, redirect to /onboarding
  // (except if they're already on /onboarding)
  // Use ! instead of === false — new users may have undefined, not false
  if (!token.onboardingCompleted && !pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
