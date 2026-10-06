"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Next.js keeps scroll position across client-side navigations by default,
 *  which feels broken in this app's single-page-per-view layout - always
 *  land at the top of the new page instead. */
export default function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
