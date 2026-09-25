import { SignJWT, jwtVerify } from 'jose';

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    return new TextEncoder().encode('dev-only-secret-not-for-production-use');
  }
  return new TextEncoder().encode(secret);
};

export interface JwtPayload {
  sub: string;
  perfil: string;
  nome: string;
}

export async function signJwt(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(getSecret());
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.perfil !== 'string' ||
      typeof payload.nome !== 'string'
    ) {
      return null;
    }
    return { sub: payload.sub, perfil: payload.perfil as string, nome: payload.nome as string };
  } catch {
    return null;
  }
}
