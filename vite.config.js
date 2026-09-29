import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The canonical origin of this deployment, resolved at build time. Hosting
// platforms expose it (Netlify: URL for the production site, DEPLOY_PRIME_URL
// for branch and deploy-preview builds). VITE_SITE_ORIGIN overrides both.
// It is injected as a literal so a production build can lock auth redirects to
// its own domain without anyone hand-editing an env var; an explicit
// VITE_ALLOWED_AUTH_ORIGINS still takes precedence at runtime.
const buildSiteOrigin = (
  process.env.VITE_SITE_ORIGIN ||
  process.env.URL ||                // Netlify: primary site URL
  process.env.DEPLOY_PRIME_URL ||   // Netlify: branch / deploy preview URL
  ''
).trim();

export default defineConfig({
  plugins: [react()],
  server: { port: 3000, open: true },
  define: {
    __BUILD_SITE_ORIGIN__: JSON.stringify(buildSiteOrigin),
  },
});
