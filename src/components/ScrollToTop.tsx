"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Standalone PWAs don't reload when reopened from the home screen - they
 *  just resume wherever they were left (any tab, any scroll position), so
 *  there's no pathname change for the plain scroll-to-top effect below to
 *  react to. Treat "hidden for a while, then visible again" as the user
 *  having reopened the app and send them back to Activities at the top.
 *  A short away-time (switching apps for a few seconds mid-task) is left
 *  alone so it doesn't discard an in-progress Add form. */
const AWAY_RESET_MS = 10 * 60 * 1000;

/** Next.js keeps scroll position across client-side navigations by default,
 *  which feels broken in this app's single-page-per-view layout - always
 *  land at the top of the new page instead. */
export default function ScrollToTop() {
  const pathname = usePathname();
  const router = useRouter();
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (hiddenAt && Date.now() - hiddenAt >= AWAY_RESET_MS) {
        if (pathname !== "/") router.push("/");
        window.scrollTo(0, 0);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [pathname, router]);

  return null;
}
