"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "familyorg_install_dismissed";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = any;

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    const dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    if (standalone || dismissed) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
    if (ios) { setVisible(true); return; }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    const onInstalled = () => {
      localStorage.setItem(DISMISSED_KEY, "1");
      setVisible(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
      <p className="text-xs font-medium text-violet-700">
        {isIOS
          ? <>Tap <strong>Share</strong> then <strong>Add to Home Screen</strong> to install Cluishi</>
          : <>Install Cluishi on this device for quick access</>}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        {!isIOS && (
          <button onClick={install} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white">
            Install
          </button>
        )}
        <button onClick={dismiss} aria-label="Dismiss" className="text-xs font-bold text-violet-400">✕</button>
      </div>
    </div>
  );
}
