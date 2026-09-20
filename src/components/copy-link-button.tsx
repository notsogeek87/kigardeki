"use client";

import { useState } from "react";

export function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard API unavailable — the link is still shown in the DOM.
        }
      }}
      className="tap-target shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 active:bg-slate-200"
    >
      {copied ? "Copié ✓" : "Copier le lien"}
    </button>
  );
}
