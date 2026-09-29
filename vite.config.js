import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The canonical origin of this deployment, resolved at build time, so a
// production build can lock auth redirects to its own domain without anyone
// hand-editing an env var. An explicit VITE_ALLOWED_AUTH_ORIGINS still wins at
// runtime, and VITE_SITE_ORIGIN overrides every automatic guess.
//
// Detection order:
// - VITE_SITE_ORIGIN                 manual override (any host)
// - DEPLOY_PRIME_URL / URL           Netlify (prime covers branch/preview builds)
// - VERCEL_PROJECT_PRODUCTION_URL    Vercel production (arrives without scheme)
// - VERCEL_URL                       Vercel preview / branch deploy (its own address)
export function detectBuildSiteOrigin(env = process.env) {
  const explicit = (env.VITE_SITE_ORIGIN || '').trim();
  if (explicit) return explicit;

  const netlify = (env.DEPLOY_PRIME_URL || env.URL || '').trim();
  if (netlify) return netlify;

  if (env.VERCEL) {
    const raw =
      env.VERCEL_ENV === 'production'
        ? (env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL || '')
        : (env.VERCEL_URL || '');
    const host = raw.trim().replace(/^https?:\/\//, '');
    return host ? `https://${host}` : '';
  }
  return '';
}

const here = dirname(fileURLToPath(import.meta.url));
const buildSiteOrigin = detectBuildSiteOrigin();

// Netlify consumes dist/_headers as config; Vercel would instead serve that
// file publicly at /_headers. Keep it for Netlify, drop it on Vercel builds.
function dropNetlifyHeadersOnVercel() {
  return {
    name: 'drop-netlify-headers-on-vercel',
    apply: 'build',
    closeBundle() {
      if (!process.env.VERCEL) return;
      const target = resolve(here, 'dist/_headers');
      if (existsSync(target)) rmSync(target);
    },
  };
}

export default defineConfig({
  plugins: [react(), dropNetlifyHeadersOnVercel()],
  server: { port: 3000, open: true },
  define: {
    __BUILD_SITE_ORIGIN__: JSON.stringify(buildSiteOrigin),
  },
});
