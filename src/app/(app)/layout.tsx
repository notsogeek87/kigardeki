import { requireSession } from "@/lib/permissions";
import { getMyFamily } from "@/lib/data/family";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();
  const family = await getMyFamily();

  return (
    <div className="min-h-screen pb-20">
      <TopBar familyName={family.name} role={user.role} />
      <div className="mx-auto max-w-lg px-4 py-4">{children}</div>
      <BottomNav />
    </div>
  );
}
