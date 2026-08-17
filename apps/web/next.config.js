/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxies API calls through this Next.js server itself so the browser only
  // ever talks to one origin — keeps the refresh-token cookie (SameSite=Lax)
  // working without switching it to SameSite=None, which cross-origin
  // browser calls straight to the API would otherwise require. API_URL picks
  // the upstream (local API by default, the deployed API in staging/prod).
  async rewrites() {
    const apiUrl = process.env.API_URL ?? 'http://localhost:4100';
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
      // Uploaded files are served by the API from /uploads (see main.ts's
      // useStaticAssets) and the storage endpoint hands back an API-relative
      // "/uploads/..." path. Proxy that prefix too, otherwise those paths
      // resolve against this origin and 404 — which is exactly what happened
      // to itinerary cover/event photos.
      { source: '/uploads/:path*', destination: `${apiUrl}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
