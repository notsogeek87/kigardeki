"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/today", label: "Aujourd'hui", icon: "📍" },
  { href: "/planning", label: "Planning", icon: "📅" },
  { href: "/children", label: "Enfants", icon: "👶" },
  { href: "/family", label: "Famille", icon: "👥" },
  { href: "/settings", label: "Réglages", icon: "⚙️" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-lg justify-between px-2">
        {ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`tap-target flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium ${
                  active ? "text-brand-600" : "text-slate-500"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
