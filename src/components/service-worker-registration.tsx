"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal: the app still works without offline caching.
    });

    // A previously-installed service worker keeps controlling already-open
    // tabs/PWA sessions until the browser notices the file changed — which
    // it only checks for periodically, so a device can stay stuck serving
    // an old deploy for a while otherwise. Reload once when a new worker
    // takes over so everyone lands on the latest version automatically.
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }, []);

  return null;
}
