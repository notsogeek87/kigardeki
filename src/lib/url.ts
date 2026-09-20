import "server-only";
import { headers } from "next/headers";

/**
 * Absolute origin for building shareable links (share/invite). Falls back to
 * the incoming request's host when NEXT_PUBLIC_APP_URL isn't configured, so
 * links never silently degrade to a path-only "/share/..." string.
 */
export async function getAppUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  const protocol = h.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}
