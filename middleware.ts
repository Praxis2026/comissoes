import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from './lib/auth';

const PUBLIC_API_PATHS = ['/api/auth/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Strip any client-supplied identity headers to prevent injection
  const cleanHeaders = new Headers(req.headers);
  cleanHeaders.delete('X-User-Id');
  cleanHeaders.delete('X-User-Perfil');
  cleanHeaders.delete('X-User-Nome');
  cleanHeaders.delete('X-Impersonating');

  if (PUBLIC_API_PATHS.includes(pathname)) {
    return NextResponse.next({ request: { headers: cleanHeaders } });
  }

  const token = req.cookies.get('jwt')?.value;
  const payload = token ? await verifyJwt(token) : null;

  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });
    }
    return NextResponse.next({ request: { headers: cleanHeaders } });
  }

  cleanHeaders.set('X-User-Id', payload.sub);
  cleanHeaders.set('X-User-Perfil', payload.perfil);
  cleanHeaders.set('X-User-Nome', payload.nome);

  const impToken = req.cookies.get('jwt-impersonate')?.value;
  if (impToken) {
    const impPayload = await verifyJwt(impToken);
    if (impPayload) {
      cleanHeaders.set('X-Impersonating', impPayload.sub);
    }
  }

  return NextResponse.next({ request: { headers: cleanHeaders } });
}

export const config = {
  matcher: ['/api/:path*'],
};
