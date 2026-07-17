import type { NextConfig } from "next";

// This app is the "MosaLink" zone of the cenacrew.com multi-zone setup. The hub
// (cenacrew/Portfolio) proxies /qrcode, /adminqrcode, /api/* and the zone's
// static assets to mosalink.cenacrew.com via rewrites. Public URLs never change
// (printed QR codes point at cenacrew.com/qrcode).
//
// assetPrefix isolates this zone's `_next/*` assets behind /mosalink-zone so
// they never collide with the hub's own `_next/*` across the proxy. The
// beforeFiles rewrite below maps that prefixed path back to the real /_next/*,
// so the zone also stays fully functional when accessed DIRECTLY (pnpm dev,
// `next start`, CI Playwright — no proxy in front). next/image's optimizer
// endpoint (/_next/image) is served under the same prefix and covered by the
// same rewrite.
const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@portfolio/shared"],
  assetPrefix: "/mosalink-zone",
  images: {
    // next/image's optimizer endpoint is NOT covered by assetPrefix (Next only
    // prefixes _next/static). Point it at the same /mosalink-zone prefix so the
    // generated /mosalink-zone/_next/image URLs ride the beforeFiles rewrite
    // below — both in direct access and through the hub proxy. Otherwise a bare
    // /_next/image would hit the HUB origin, not this zone, breaking Supabase
    // widget images behind the proxy.
    path: "/mosalink-zone/_next/image",
    // Supabase Storage public URLs (photo/video widget uploads) served through
    // next/image. Any project ref under supabase.co is allowed so the same
    // build works across environments.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  experimental: {
    // Server Actions (admin dashboard) run behind the hub's reverse proxy, so
    // the forwarded Origin is the hub host, not this zone's. Whitelist the hub
    // origins to keep the CSRF check from returning 403 through the proxy.
    serverActions: {
      allowedOrigins: ["cenacrew.com", "www.cenacrew.com"],
    },
  },
  async redirects() {
    // The technical sub-domain is never a public destination: bounce its root
    // to the hub. 308 (permanent) — no one should settle on mosalink.cenacrew.com.
    return [
      { source: "/", destination: "https://cenacrew.com", permanent: true },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Serve this zone's prefixed assets from the real _next path, both
        // directly and through the hub proxy.
        { source: "/mosalink-zone/_next/:path*", destination: "/_next/:path*" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    // The zone host is indexable ONLY through cenacrew.com. When reached on its
    // technical sub-domain, tell crawlers not to index it. metadataBase and
    // canonicals stay https://cenacrew.com, so shared links keep pointing at the
    // public host.
    //
    // IMPORTANT: match on x-forwarded-host, NOT host. Through the hub's
    // multi-zone proxy, the request Next.js sees here always has
    // Host: mosalink.cenacrew.com (that's how the proxy routes to this zone),
    // even when the client's original request was to cenacrew.com/qrcode. A
    // `type: "host"` match would therefore fire on EVERY request served
    // through the proxy — including the public cenacrew.com/qrcode traffic
    // the printed QR codes point at — and noindex it too. x-forwarded-host
    // instead carries the client's original host: mosalink.cenacrew.com only
    // on direct access to the sub-domain, and www.cenacrew.com/cenacrew.com
    // when reached through the proxy, so only direct access gets noindexed.
    return [
      {
        source: "/:path*",
        has: [{ type: "header", key: "x-forwarded-host", value: "mosalink.cenacrew.com" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
};

export default nextConfig;
