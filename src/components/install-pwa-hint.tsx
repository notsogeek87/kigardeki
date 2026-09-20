"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPwaHint() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent) && !standalone);

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed) {
    return <p className="text-sm text-slate-500">✅ Application installée sur cet appareil.</p>;
  }

  if (deferredPrompt) {
    return (
      <button
        type="button"
        onClick={async () => {
          await deferredPrompt.prompt();
          setDeferredPrompt(null);
        }}
        className="tap-target rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white active:bg-brand-700"
      >
        Installer l&apos;application
      </button>
    );
  }

  if (isIOS) {
    return (
      <p className="text-sm text-slate-500">
        Sur iPhone/iPad : appuyez sur le bouton <strong>Partager</strong>, puis{" "}
        <strong>Sur l&apos;écran d&apos;accueil</strong>.
      </p>
    );
  }

  return (
    <p className="text-sm text-slate-500">
      Ouvrez le menu de votre navigateur et choisissez <strong>Installer l&apos;application</strong> ou{" "}
      <strong>Ajouter à l&apos;écran d&apos;accueil</strong>.
    </p>
  );
}
