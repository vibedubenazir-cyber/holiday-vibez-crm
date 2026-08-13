/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Temporary: proxies API calls through the Next.js dev server itself so a
  // single ngrok tunnel (this app's port) is enough to demo the whole stack
  // — the API on :4100 never needs its own public tunnel. Safe to remove
  // once the ngrok demo is done; local dev works the same either way since
  // NEXT_PUBLIC_API_URL controls whether the browser calls this rewrite or
  // hits the API directly.
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'http://localhost:4100/api/:path*' }];
  },
};

module.exports = nextConfig;
