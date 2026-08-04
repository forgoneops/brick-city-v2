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

// Same-origin client — vite dev proxies /trpc to the Hono server.
export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/trpc',
      headers() {
        const token = getToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});