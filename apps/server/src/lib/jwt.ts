import { SignJWT, jwtVerify } from 'jose';
import { env } from '../env.js';
import type { Role } from '@bcv2/shared';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface SessionPayload {
  sub: string;
  role: Role;
}

// Default sessions are idle-monitored client-side (30 min — see
// lib/session.tsx) so the JWT itself only needs a short hard ceiling, not a
// week-long TTL, per the "keep me logged in" opt-in decision (see
// docs/DECISIONS.md). "Remember me" sessions skip client idle tracking
// entirely, so their token TTL is the only expiry that matters — 30d rather
// than the old flat 7d, since a deliberate opt-in reads more like "remember
// me for a month" than "for a week."
const DEFAULT_SESSION_TTL = '4h';
const REMEMBER_ME_TTL = '30d';

export async function signSessionToken(payload: SessionPayload, rememberMe = false): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(rememberMe ? REMEMBER_ME_TTL : DEFAULT_SESSION_TTL)
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
