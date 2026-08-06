import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@bcv2/server';

const TOKEN_KEY = 'bcm_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Same-origin by default (vite dev proxies /trpc to the Hono server; prod
// recommends the same reverse-proxy topology — see docs/deploy.md, which
// also covers the /uploads caveat that comes with going cross-origin).
// Set VITE_API_BASE_URL to point at a backend on a different origin.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${API_BASE}/trpc`,
      headers() {
        const token = getToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});