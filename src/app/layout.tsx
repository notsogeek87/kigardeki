import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { NetworkStatusBanner } from "@/components/network-status-banner";

export const metadata: Metadata = {
  title: "Kigardeki — Planning familial",
  description: "Le planning familial des enfants, des écoles, des crèches et des gardes.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kigardeki",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: [{ url: "/favicon.ico" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the per-request CSP nonce (set in src/middleware.ts) forces this
  // layout — and therefore every page under it — to render dynamically, so
  // a statically-cached page can never ship with a nonce from a different
  // request than the one that set the response's CSP header.
  await headers();

  return (
    <html lang="fr">
      <body>
        <NetworkStatusBanner />
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
