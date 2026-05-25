"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { ThemeToggle } from "@/components/ThemeProvider";
import { UserMenu } from "@/components/UserMenu";

interface LinkData {
  id: string;
  shortCode: string;
  originalUrl: string;
  clickCount: number;
  createdAt: string;
  isActive: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const { addToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [links, setLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUser(data.user);
      fetchLinks(data.user.id);
    });
  }, []);

  const fetchLinks = async (userId: string) => {
    const res = await fetch("/api/links/user", {
      headers: { "x-user-id": userId },
    });
    if (res.ok) {
      const data = await res.json();
      setLinks(data.links);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await fetch("/api/presence/offline", { method: "POST" });
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this link?")) return;
    const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
    if (res.ok) {
      setLinks(links.filter((l) => l.id !== id));
      addToast("success", "Link deleted");
    } else {
      addToast("error", "Failed to delete link");
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    const res = await fetch(`/api/links/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentActive }),
    });
    if (res.ok) {
      setLinks(links.map((l) => (l.id === id ? { ...l, isActive: !currentActive } : l)));
      addToast("success", currentActive ? "Link disabled" : "Link enabled");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center neu-bg">
        <div className="neu-convex w-16 h-16 rounded-2xl flex items-center justify-center">
          <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen neu-bg">
      <header className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="neu-convex w-10 h-10 rounded-2xl flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[var(--text)]">
            <span className="text-[var(--primary)]">Womist Short</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <UserMenu email={user?.email || ""} size={32} />
          <Link href="/" className="neu-btn px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">Home</Link>
          <button onClick={handleLogout} className="neu-btn px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">Logout</button>
          <ThemeToggle />
        </div>
      </header>

      <main className="px-6 pb-10 max-w-5xl mx-auto">
        <div className="neu-card mb-6 animate-fade-in">
          <p className="text-sm text-[var(--text-secondary)]">Total Links</p>
          <p className="text-3xl font-bold text-[var(--primary)]">{links.length}</p>
        </div>

        <div className="neu-card animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--text)]">My Links</h2>
            <Link href="/" className="neu-primary-btn !py-2.5 !px-5 text-sm">+ New Link</Link>
          </div>
          {links.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-secondary)]">
              <p>No links yet.</p>
              <Link href="/" className="text-[var(--primary)] font-semibold mt-2 inline-block">Create your first link</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--text-secondary)]">
                    <th className="pb-3 font-semibold px-3">Short Link</th>
                    <th className="pb-3 font-semibold px-3 hidden md:table-cell">Original URL</th>
                    <th className="pb-3 font-semibold px-3 text-center">Clicks</th>
                    <th className="pb-3 font-semibold px-3 text-center hidden sm:table-cell">Status</th>
                    <th className="pb-3 font-semibold px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((link) => (
                    <tr key={link.id} className="border-t border-[var(--shadow-dark)]/30">
<td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <Link href={"/dashboard/links/" + link.id} className="text-[var(--primary)] font-semibold hover:underline">/s/{link.shortCode}</Link>
                          <button onClick={() => { navigator.clipboard.writeText(process.env.NEXT_PUBLIC_BASE_URL + "/s/" + link.shortCode); addToast("success", "Copied!"); }} className="neu-btn p-1" title="Copy link">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 hidden md:table-cell max-w-[150px] truncate text-[var(--text-secondary)]">{link.originalUrl}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="neu-badge text-[var(--primary)]">{link.clickCount}</span>
                      </td>
                      <td className="py-3 px-3 text-center hidden sm:table-cell">
                        <button
                          onClick={() => handleToggle(link.id, link.isActive)}
                          className={link.isActive ? "neu-badge text-[var(--success)] cursor-pointer" : "neu-badge text-[var(--danger)] cursor-pointer"}
                        >
                          {link.isActive ? "Active" : "Disabled"}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/dashboard/links/${link.id}`} className="neu-btn px-3 py-1.5 text-xs font-semibold text-[var(--primary)]">View</Link>
                          <button onClick={() => handleDelete(link.id)} className="neu-btn px-3 py-1.5 text-xs font-semibold text-[var(--danger)]">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}