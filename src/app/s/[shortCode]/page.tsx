"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function RedirectPage() {
  const params = useParams();
  const shortCode = params.shortCode as string;
  const [error, setError] = useState("");
  const [destUrl, setDestUrl] = useState("");
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    const track = async () => {
      try {
        const screenResolution = `${window.screen.width}x${window.screen.height}`;
        const language = navigator.language || "";

        const res = await fetch("/api/clicks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shortCode,
            screenResolution,
            language,
            referrer: document.referrer || "",
          }),
        });

        const data = await res.json();

        if (data.originalUrl) {
          setDestUrl(data.originalUrl);
          setTracked(true);
          window.location.replace(data.originalUrl);
        } else if (!res.ok) {
          setError(data.error || "Link not found");
        }
      } catch {
        setError("Something went wrong");
      }
    };

    track();
  }, [shortCode]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center neu-bg">
        <div className="neu-card text-center max-w-md">
          <div className="neu-convex w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Link Not Found</h1>
          <p className="text-[var(--text-secondary)] mb-6">{error}</p>
          <a href="/" className="neu-primary-btn inline-block">
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center neu-bg">
      <div className="text-center animate-fade-in neu-card max-w-lg w-full">
        {destUrl ? (
          <>
            <p className="text-[var(--text-secondary)] mb-2 text-sm">
              {tracked ? "Redirecting you..." : "Loading..."}
            </p>
            <a
              href={destUrl}
              className="neu-primary-btn inline-block text-lg px-8 py-3"
            >
              Continue to destination
            </a>
            <p className="text-[var(--text-secondary)] mt-4 text-xs break-all">
              {destUrl}
            </p>
          </>
        ) : (
          <>
            <div className="neu-convex w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="animate-spin" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[var(--text)]">Redirecting you...</h1>
            <p className="text-[var(--text-secondary)] mt-2 text-sm">Please wait a moment</p>
          </>
        )}
      </div>
    </div>
  );
}
