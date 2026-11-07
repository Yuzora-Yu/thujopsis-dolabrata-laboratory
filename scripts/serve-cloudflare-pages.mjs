// Match build:cloudflare-pages locally; this never contacts Cloudflare.
process.env.PAGES_BASE_PATH='/';
await import('./serve-pages.mjs');
