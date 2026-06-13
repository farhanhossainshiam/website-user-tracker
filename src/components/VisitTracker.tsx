"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return;

    const track = async () => {
      try {
        await fetch("/api/visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: pathname || "/",
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language || "",
            referrer: document.referrer || "",
          }),
        });
      } catch {}
    };

    track();
  }, [pathname]);

  return null;
}