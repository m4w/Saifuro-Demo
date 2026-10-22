"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * After a client-side navigation, move focus to the new page's heading, so
 * keyboard and screen reader users start at the top of the new content. Skips
 * the first load, and leaves focus alone if the page already placed it.
 *
 * Some headings only appear once data loads. Until then focus waits on <main>,
 * and moves to the heading when it shows up, unless the user moved on.
 */
export function RouteFocus() {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;

    const active = document.activeElement;
    const focusIsLost =
      !active ||
      active === document.body ||
      !(active as HTMLElement).checkVisibility?.();
    const main = document.getElementById("main");
    if (!focusIsLost || !main) return;

    const focusHeading = () => {
      const heading = [...main.querySelectorAll("h1")].find((h) =>
        h.checkVisibility(),
      );
      heading?.focus();
      return Boolean(heading);
    };
    if (focusHeading()) return;

    main.focus();
    const observer = new MutationObserver(() => {
      if (document.activeElement !== main || focusHeading())
        observer.disconnect();
    });
    observer.observe(main, { childList: true, subtree: true });
    const timeout = setTimeout(() => observer.disconnect(), 5_000);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [pathname]);

  return null;
}
