import test from 'node:test';
import assert from 'node:assert/strict';
import { detectBuildSiteOrigin } from '../vite.config.js';

test('an explicit VITE_SITE_ORIGIN wins over every platform guess', () => {
  assert.equal(
    detectBuildSiteOrigin({ VITE_SITE_ORIGIN: 'https://picu.example.org.np', URL: 'https://x.netlify.app', VERCEL: '1', VERCEL_URL: 'y.vercel.app' }),
    'https://picu.example.org.np',
  );
});

test('Netlify deploys lock to their own address, previews included', () => {
  assert.equal(detectBuildSiteOrigin({ URL: 'https://picu.netlify.app' }), 'https://picu.netlify.app');
  assert.equal(
    detectBuildSiteOrigin({ URL: 'https://picu.netlify.app', DEPLOY_PRIME_URL: 'https://deploy-preview-5--picu.netlify.app' }),
    'https://deploy-preview-5--picu.netlify.app',
  );
});

test('Vercel production locks to the production domain, previews to themselves', () => {
  assert.equal(
    detectBuildSiteOrigin({ VERCEL: '1', VERCEL_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'picu.vercel.app', VERCEL_URL: 'picu-abc123.vercel.app' }),
    'https://picu.vercel.app',
  );
  assert.equal(
    detectBuildSiteOrigin({ VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_URL: 'picu-git-branch.vercel.app' }),
    'https://picu-git-branch.vercel.app',
  );
  // Vercel supplies bare hosts; the scheme must be added exactly once
  assert.equal(
    detectBuildSiteOrigin({ VERCEL: '1', VERCEL_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'https://picu.vercel.app' }),
    'https://picu.vercel.app',
  );
});

test('a bare local build detects nothing and stays unlocked', () => {
  assert.equal(detectBuildSiteOrigin({}), '');
});
