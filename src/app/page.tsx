"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { ThemeToggle } from "@/components/ThemeProvider";
import { UserMenu } from "@/components/UserMenu";

export default function Home() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const { addToast } = useToast();
  const [url, setUrl] = useState("");
  
  const [result, setResult] = useState<{ shortCode: string; shortUrl: string; originalUrl: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [banned, setBanned] = useState(false);
  const [domain, setDomain] = useState("dinka.shop");

  const domains = [
    { value: "dinka.shop", label: "dinka.shop" },
    { value: "womist.shop", label: "womist.shop" },
  ];

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }: { data: { user: any } }) => {
      const u = data.user ?? null;
      setUser(u);
      if (u) {
        const { data: bannedRow } = await supabase.from("BannedUsers").select("userId").eq("userId", u.id).single();
        if (bannedRow) {
          setBanned(true);
          return;
        }
        const { data: profile } = await supabase.from("Profile").select("role").eq("userId", u.id).single();
        setIsAdmin(profile?.role === "admin");
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setLoading(true);

    if (banned) {
      addToast("error", "You are banned and cannot create links.");
      setLoading(false);
      return;
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        headers["x-user-id"] = user.id;
        headers["x-user-email"] = user.email || "";
      }

      const res = await fetch("/api/links", { method: "POST", headers, body: JSON.stringify({ url, domain }) });
      const data = await res.json();
      if (!res.ok) {
        addToast("error", data.error || "Failed to create link");
      } else {
        setResult(data);
        setUrl("");
        addToast("success", "Short link created!");
        if (!user) setShowSignupModal(true);
      }
    } catch {
      addToast("error", "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.shortUrl);
    setCopied(true);
    addToast("success", "Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    await fetch("/api/presence/offline", { method: "POST" });
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {banned ? (
        <>
          <header className="w-full px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="neu-convex w-10 h-10 rounded-2xl flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">
                Womist<span className="text-[var(--primary)]"> Short</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
            <div className="animate-fade-in neu-card max-w-md w-full text-center">
              <div className="neu-pressed w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[var(--danger)] mb-3">Account Banned</h2>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                You have been banned for violating our terms and conditions.
              </p>
            </div>
          </main>
          <footer className="text-center py-6 text-sm text-[var(--text-secondary)]">
            Copyright 2026. Womist Service
          </footer>
        </>
      ) : (
        <>
          <header className="w-full px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-70 transition duration-200">
          <div className="neu-convex w-10 h-10 rounded-2xl flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">
            Womist<span className="text-[var(--primary)]"> Short</span>
          </h1>
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <UserMenu email={user.email} size={32} />
              {isAdmin && (
                <Link href="/admin/dashboard" className="neu-btn px-4 py-2.5 text-sm font-semibold text-[var(--primary)]">
                  Admin
                </Link>
              )}
              <Link href="/dashboard" className="neu-btn px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)]">
                Dashboard
              </Link>
              <button onClick={handleLogout} className="neu-btn px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)]">
                Logout
              </button>
              <ThemeToggle />
            </>
          ) : (
            <>
              <Link href="/login" className="neu-btn px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)]">Login</Link>
              <Link href="/register" className="neu-primary-btn !py-2.5 !px-5 text-sm">Register</Link>
              <ThemeToggle />
            </>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
        <div className="animate-fade-in w-full max-w-xl">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-extrabold text-[var(--text)] mb-3 tracking-tight">Shorten Your Links</h2>
            <p className="text-[var(--text-secondary)] text-lg">Create short links, share them, and track every click with powerful analytics.</p>
          </div>

          <form onSubmit={handleSubmit} className="neu-card mb-6">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2 ml-1">Paste your long URL</label>
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/very-long-url..." className="neu-input" required />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2 ml-1">Short domain</label>
              <div className="flex gap-2">
                {domains.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDomain(d.value)}
                    className={domain === d.value ? "neu-pressed flex-1 py-2 px-3 text-xs font-semibold rounded-xl text-[var(--primary)]" : "neu-btn flex-1 py-2 px-3 text-xs font-semibold rounded-xl text-[var(--text-secondary)]"}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={loading} className="neu-primary-btn w-full">
              {loading ? "Shortening..." : "Shorten Link"}
            </button>
          </form>

          {result && (
            <div className="animate-fade-in neu-card border-l-4 border-l-[var(--primary)]">
              <div className="mb-3">
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">Your short link is ready</p>
                <span className="text-xl font-bold text-[var(--primary)] break-all">{result.shortUrl}</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={copyToClipboard} className="neu-btn px-5 py-2.5 text-sm font-semibold text-[var(--text)]">{copied ? "Copied!" : "Copy"}</button>
                <a href={result.shortUrl} target="_blank" rel="noopener noreferrer" className="neu-btn px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)]">Test</a>
              </div>
            </div>
          )}
        </div>
      </main>

      {showSignupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowSignupModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative neu-card max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowSignupModal(false)} className="absolute top-4 right-4 neu-btn w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] text-lg">&times;</button>

            <div className="text-center mb-6">
              <div className="neu-convex w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4-4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[var(--text)]">Your link is ready!</h3>
              <p className="text-[var(--text-secondary)] text-sm mt-1">Create a free account to unlock more features:</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 neu-pressed !p-3 !rounded-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span className="text-sm text-[var(--text)]">Custom short codes for your links</span>
              </div>
              <div className="flex items-center gap-3 neu-pressed !p-3 !rounded-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span className="text-sm text-[var(--text)]">Full dashboard to manage all your links</span>
              </div>
              <div className="flex items-center gap-3 neu-pressed !p-3 !rounded-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span className="text-sm text-[var(--text)]">Detailed click analytics — browser, OS, location, device</span>
              </div>
              <div className="flex items-center gap-3 neu-pressed !p-3 !rounded-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span className="text-sm text-[var(--text)]">Toggle links on/off anytime &amp; track every visitor</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Link href="/register" className="neu-primary-btn w-full text-center !py-3">Create Free Account</Link>
              <button onClick={() => setShowSignupModal(false)} className="neu-btn w-full py-3 text-sm font-semibold text-[var(--text-secondary)]">Maybe Later</button>
            </div>
          </div>
        </div>
      )}
      <footer className="text-center py-6 text-sm text-[var(--text-secondary)]">
        Copyright 2026. Womist Service
      </footer>
      </>
      )}
    </div>
  );
}