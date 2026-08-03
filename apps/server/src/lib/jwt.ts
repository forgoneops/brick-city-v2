import { SignJWT, jwtVerify } from 'jose';
import { env } from '../env.js';
import type { Role } from '@bcv2/shared';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface SessionPayload {
  sub: string;
  role: Role;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const sub = payload.sub;
    const role = payload.role as Role | undefined;
    if (!sub || !role) return null;
    return { sub, role };
  } catch {
    return null;
  }
}
