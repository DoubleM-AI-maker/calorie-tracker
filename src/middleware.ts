import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Lokales Development Fallback (simuliert Authelia)
  if (process.env.NODE_ENV === 'development') {
    const response = NextResponse.next();
    response.headers.set('x-remote-user', 'local-admin');
    response.headers.set('x-remote-email', 'admin@localhost');
    response.headers.set('x-remote-groups', 'admin');
    return response;
  }

  // Production: Check ob Authelia Header vorhanden sind
  const authUser = request.headers.get('Remote-User');
  
  if (!authUser) {
    // Wenn kein Header vorhanden ist, aber wir in Produktion sind (und hinterm Proxy),
    // sollte das eigentlich vom Caddy/Authelia geblockt werden.
    return new NextResponse('Unauthorized: Missing Authelia Headers', {
      status: 401,
    });
  }

  const response = NextResponse.next();
  
  // Umbau auf interne Header-Struktur für Server Components
  response.headers.set('x-remote-user', authUser);
  
  const email = request.headers.get('Remote-Email');
  if (email) {
    response.headers.set('x-remote-email', email);
  }

  const groups = request.headers.get('Remote-Groups');
  if (groups) {
    response.headers.set('x-remote-groups', groups);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js (service worker)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|sw\\.ts|icons/).*)',
  ],
};
