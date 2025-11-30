import { NextResponse } from 'next/server';

// Paths that require authentication
const PROTECTED_PATHS = ['/dashboard', '/api/users', '/api/correcoes'];
// Paths that are public (auth related)
const PUBLIC_PATHS = ['/api/auth', '/api/health', '/_next', '/favicon.ico', '/public'];

export function middleware(request) {
    const { pathname } = request.nextUrl;

    // Check if the path is protected
    const isProtected = PROTECTED_PATHS.some(path => pathname.startsWith(path));

    if (isProtected) {
        const token = request.cookies.get('token')?.value ||
            request.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            // If it's an API request, return 401
            if (pathname.startsWith('/api')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            // If it's a page request, redirect to login
            return NextResponse.redirect(new URL('/', request.url));
        }

        // Verify token (basic check, full verification happens in API/Page)
        // Note: In middleware (Edge Runtime), we might have limitations with some libraries.
        // Ideally, we just check existence here or use a lightweight verify if possible.
        // For now, we rely on the API/Page to do the heavy lifting of verification
        // but we ensure a token is present.
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (auth routes)
         * - api/health (health check)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api/auth|api/health|_next/static|_next/image|favicon.ico).*)',
    ],
};
