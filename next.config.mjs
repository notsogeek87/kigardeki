/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Cache client court : les server actions appellent revalidatePath /
    // revalidateTag après chaque modification (ce qui vide ce cache), il ne
    // sert donc qu'à éviter un aller-retour serveur à chaque clic d'onglet.
    staleTimes: {
      dynamic: 30,
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
