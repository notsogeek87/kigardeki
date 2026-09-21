/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Toutes les pages de l'app affichent des données par famille/session
    // (enfants, plannings, gardes) : le cache client du routeur ne doit
    // jamais servir une version obsolète après une modification, même en
    // naviguant vers un onglet déjà visité.
    staleTimes: {
      dynamic: 0,
    },
  },
  async headers() {
    return [
      {
        // Applies to every route. The per-request Content-Security-Policy
        // (with its nonce) is set in src/middleware.ts instead, since it
        // must vary per request — these are the static ones that don't.
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Content-Type", value: "application/manifest+json" }],
      },
    ];
  },
};

export default nextConfig;
