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
