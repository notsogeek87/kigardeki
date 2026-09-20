"use client";

import { useEffect, useState } from "react";

export function NetworkStatusBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="sticky top-0 z-50 bg-amber-500 px-4 py-1.5 text-center text-sm font-medium text-white">
      Vous êtes hors ligne — certaines actions seront indisponibles.
    </div>
  );
}
