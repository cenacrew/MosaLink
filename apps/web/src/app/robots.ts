import type { MetadataRoute } from "next";

// This robots.txt is NEVER served through cenacrew.com: the hub
// (cenacrew/Portfolio) proxies only /qrcode, /adminqrcode, /api/* and this
// zone's static assets — /robots.txt is not in its rewrites, so the hub
// serves its own robots.txt for cenacrew.com/robots.txt. This file therefore
// only reaches crawlers that hit mosalink.cenacrew.com directly, which we
// never want indexed (the canonical, public URL is cenacrew.com/qrcode;
// metadataBase and canonicals already point there). Disallow everything.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
