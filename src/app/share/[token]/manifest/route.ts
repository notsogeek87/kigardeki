import { NextResponse } from "next/server";
import { resolveShareToken } from "@/lib/data/shareLinks";

/**
 * Per-link web app manifest. The global /manifest.webmanifest starts at
 * /today, which sends a grandparent who "added the planning to their home
 * screen" from a share link to the parents' login page instead. This one
 * reopens the very planning they were looking at.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await resolveShareToken(token);
  if (!share) return new NextResponse(null, { status: 404 });

  const start = `/share/${token}`;
  return NextResponse.json(
    {
      name: `Planning — ${share.familyName}`,
      short_name: "Planning",
      start_url: start,
      scope: start,
      display: "standalone",
      background_color: "#f8fafc",
      theme_color: "#2563eb",
      lang: "fr",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    }
  );
}
