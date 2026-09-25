import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from './lib/auth';

const PUBLIC_API_PATHS = ['/api/auth/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_API_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get('jwt')?.value;
  const payload = token ? await verifyJwt(token) : null;

  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });
    }
    return NextResponse.next();
  }

  const res = NextResponse.next();
  res.headers.set('X-User-Id', payload.sub);
  res.headers.set('X-User-Perfil', payload.perfil);
  res.headers.set('X-User-Nome', payload.nome);

  const impToken = req.cookies.get('jwt-impersonate')?.value;
  if (impToken) {
    const impPayload = await verifyJwt(impToken);
    if (impPayload) {
      res.headers.set('X-Impersonating', impPayload.sub);
    }
  }

  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};
