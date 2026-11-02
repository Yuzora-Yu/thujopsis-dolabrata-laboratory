// Prepare a root-hosted static release locally; no Cloudflare API calls or DNS changes.
process.env.PAGES_BASE_PATH='/';
await import('./build-pages.mjs');
