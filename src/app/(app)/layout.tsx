import { redirect } from "next/navigation";
import { requireSession, UnauthorizedError } from "@/lib/permissions";
import { getMyFamily } from "@/lib/data/family";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Middleware is the primary gate; this is a defense-in-depth fallback so
  // an edge case (e.g. a session expiring between the middleware check and
  // this render) redirects cleanly instead of crashing the page.
  let user;
  try {
    user = await requireSession();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    throw error;
  }

  const family = await getMyFamily();

  return (
    <div className="min-h-screen pb-20">
      <TopBar familyName={family.name} role={user.role} />
      <div className="mx-auto max-w-lg px-4 py-4">{children}</div>
      <BottomNav />
    </div>
  );
}
