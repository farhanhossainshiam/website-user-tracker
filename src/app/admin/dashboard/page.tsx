"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { ThemeToggle } from "@/components/ThemeProvider";
import { Avatar } from "@/components/Avatar";
import { UserMenu } from "@/components/UserMenu";

interface LinkData {
  id: string; shortCode: string; originalUrl: string;
  clickCount: number; createdAt: string; isActive: boolean; userEmail?: string;
}

interface UserData {
  userId: string; email: string; linkCount: number;
  totalClicks: number; isOnline: boolean; lastSeen: string | null;
}

interface DashboardData {
  totalLinks: number; activeLinks: number; totalClicks: number; recentClicks24h: number; links: LinkData[];
}

interface UserStats {
  totalUsers: number;
  onlineUsers: number;
  offlineUsers: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const { addToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<"links" | "users" | "stats">("stats");
  const [data, setData] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<UserStats>({ totalUsers: 0, onlineUsers: 0, offlineUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);

  const fetchUserStats = useCallback(async () => {
    const res = await fetch("/api/admin/users/stats");
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchDashboard = useCallback(async () => {
    const res = await fetch("/api/admin/dashboard");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const d = await res.json();
      setUsers(d.users || []);
    }
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      if (!user) { router.push("/login"); return; }
      setUser(user);
      fetchDashboard();
      fetchUserStats();
      fetchUsers();
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchUserStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [user, fetchUserStats]);

  const handleLogout = async () => {
    await fetch("/api/presence/offline", { method: "POST" });
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm("Delete this link?")) return;
    await fetch(`/api/admin/links/${id}`, { method: "DELETE" });
    if (data) setData({ ...data, links: data.links.filter(l => l.id !== id), totalLinks: data.totalLinks - 1 });
  };

  const handleToggleLink = async (id: string, cur: boolean) => {
    await fetch(`/api/admin/links/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !cur }) });
    if (data) setData({ ...data, links: data.links.map(l => l.id === id ? { ...l, isActive: !cur } : l) });
    fetchDashboard();
  };

  const handleBan = async (u: UserData) => {
    if (!confirm(`Ban ${u.email}?`)) return;
    const res = await fetch(`/api/admin/users/${u.userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ban: true, email: u.email }),
    });
    if (res.ok) { addToast("success", `${u.email} banned`); fetchUsers(); fetchUserStats(); }
    else addToast("error", "Failed to ban user");
  };

  const handleUnban = async (u: UserData) => {
    const res = await fetch(`/api/admin/users/${u.userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ban: false, email: u.email }),
    });
    if (res.ok) { addToast("success", `${u.email} unbanned`); fetchUsers(); fetchUserStats(); }
    else addToast("error", "Failed to unban user");
  };

  const handleDeleteUser = async (u: UserData) => {
    if (!confirm(`PERMANENTLY DELETE ${u.email} and all their data? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${u.userId}`, { method: "DELETE" });
    if (res.ok) { addToast("success", `${u.email} deleted`); fetchUsers(); fetchDashboard(); fetchUserStats(); }
    else addToast("error", "Failed to delete user");
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

  const StatCard = ({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) => (
    <div className="neu-card !p-6 flex items-center gap-4">
      <div className="neu-convex w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{label}</p>
        <p className={`text-3xl font-bold ${color} mt-1`}>{value}</p>
      </div>
    </div>
  );

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
          <h1 className="text-xl font-bold text-[var(--text)]"><span className="text-[var(--primary)]">Womist Short</span> Admin</h1>
        </div>
        <div className="flex items-center gap-3">
          <UserMenu email={user?.email || ""} size={32} />
          <Link href="/" className="neu-btn px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">Home</Link>
          <button onClick={handleLogout} className="neu-btn px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">Logout</button>
          <ThemeToggle />
        </div>
      </header>

      <main className="px-6 pb-10 max-w-7xl mx-auto">
        <div className="flex gap-3 mb-6">
          <button onClick={() => setTab("stats")} className={tab === "stats" ? "neu-primary-btn !py-2.5 !px-5 text-sm" : "neu-btn px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)]"}>Statistics</button>
          <button onClick={() => setTab("links")} className={tab === "links" ? "neu-primary-btn !py-2.5 !px-5 text-sm" : "neu-btn px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)]"}>Links</button>
          <button onClick={() => { setTab("users"); fetchUsers(); }} className={tab === "users" ? "neu-primary-btn !py-2.5 !px-5 text-sm" : "neu-btn px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)]"}>Users</button>
        </div>

        {tab === "stats" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8 animate-fade-in">
              <StatCard
                label="Total Users"
                value={stats.totalUsers}
                color="text-[var(--text)]"
                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
              />
              <StatCard
                label="Online Users"
                value={stats.onlineUsers}
                color="text-[var(--success)]"
                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.636 18.364a9 9 0 0 1 0-12.728" /><path d="M18.364 5.636a9 9 0 0 1 0 12.728" /><circle cx="12" cy="12" r="3" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /></svg>}
              />
              <StatCard
                label="Offline Users"
                value={stats.offlineUsers}
                color="text-[var(--text-secondary)]"
                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>}
              />
            </div>

            <div className="neu-card animate-fade-in mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[var(--text)]">User Activity</h2>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "var(--success)", boxShadow: "0 0 6px var(--success)" }} />
                  <span className="text-xs text-[var(--text-secondary)]">Live · refreshes every 5s</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="neu-pressed !p-5 flex flex-col items-center justify-center">
                  <div className="relative">
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="var(--shadow-dark)" strokeWidth="6" />
                      <circle cx="40" cy="40" r="34" fill="none" stroke="var(--success)" strokeWidth="6" strokeDasharray={`${stats.totalUsers > 0 ? (stats.onlineUsers / stats.totalUsers) * 213.6 : 0} 213.6`} strokeLinecap="round" transform="rotate(-90 40 40)" style={{ transition: "stroke-dasharray 0.8s ease" }} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-[var(--success)]">{stats.totalUsers > 0 ? Math.round((stats.onlineUsers / stats.totalUsers) * 100) : 0}%</span>
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-secondary)] mt-3">Online Rate</p>
                </div>
                <div className="neu-pressed !p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-3 h-3 rounded-full" style={{ background: "var(--success)", boxShadow: "0 0 6px var(--success)" }} />
                    <p className="text-sm font-bold text-[var(--success)]">Online ({stats.onlineUsers})</p>
                  </div>
                  <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                    {users.filter(u => u.isOnline).length === 0 ? (
                      <p className="text-xs text-[var(--text-secondary)]">No users online</p>
                    ) : users.filter(u => u.isOnline).map(u => (
                      <div key={u.userId} className="flex items-center gap-2">
                        <Avatar email={u.email} size={24} tooltip />
                        <span className="text-sm font-medium text-[var(--text)] truncate">{u.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="neu-pressed !p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-3 h-3 rounded-full bg-[var(--shadow-dark)]" />
                    <p className="text-sm font-bold text-[var(--text-secondary)]">Offline ({stats.offlineUsers})</p>
                  </div>
                  <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                    {users.filter(u => !u.isOnline).length === 0 ? (
                      <p className="text-xs text-[var(--text-secondary)]">No offline users</p>
                    ) : users.filter(u => !u.isOnline).map(u => (
                      <div key={u.userId} className="flex items-center gap-2">
                        <Avatar email={u.email} size={24} tooltip />
                        <span className="text-sm font-medium text-[var(--text-secondary)] truncate">{u.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {data && (
              <div className="neu-card animate-fade-in">
                <h2 className="text-lg font-bold text-[var(--text)] mb-4">Quick Stats</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="neu-pressed !p-4 text-center">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Total Links</p>
                    <p className="text-2xl font-bold text-[var(--text)] mt-1">{data.totalLinks}</p>
                  </div>
                  <div className="neu-pressed !p-4 text-center">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Active Links</p>
                    <p className="text-2xl font-bold text-[var(--success)] mt-1">{data.activeLinks}</p>
                  </div>
                  <div className="neu-pressed !p-4 text-center">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Total Clicks</p>
                    <p className="text-2xl font-bold text-[var(--primary)] mt-1">{data.totalClicks}</p>
                  </div>
                  <div className="neu-pressed !p-4 text-center">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Clicks (24h)</p>
                    <p className="text-2xl font-bold text-[var(--primary)] mt-1">{data.recentClicks24h}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "links" && data && (
          <div className="neu-card animate-fade-in overflow-x-auto">
            <h2 className="text-lg font-bold text-[var(--text)] mb-4">All Links</h2>
            {data.links.length === 0 ? (
              <p className="text-center py-12 text-[var(--text-secondary)]">No links yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[var(--text-secondary)]"><th className="pb-3 font-semibold px-3">Short</th><th className="pb-3 font-semibold px-3 hidden lg:table-cell">Owner</th><th className="pb-3 font-semibold px-3 hidden md:table-cell">Original</th><th className="pb-3 font-semibold px-3 text-center">Clicks</th><th className="pb-3 font-semibold px-3 text-center hidden sm:table-cell">Status</th><th className="pb-3 font-semibold px-3 text-center">Actions</th></tr></thead>
                <tbody>
                  {data.links.map(l => (
                    <tr key={l.id} className="border-t border-[var(--shadow-dark)]/30">
                      <td className="py-3 px-3"><div className="flex items-center gap-1"><Link href={`/admin/dashboard/links/${l.id}`} className="text-[var(--primary)] font-semibold hover:underline">/s/{l.shortCode}</Link><button onClick={() => { navigator.clipboard.writeText(process.env.NEXT_PUBLIC_BASE_URL + "/s/" + l.shortCode); addToast("success", "Copied!"); }} className="neu-btn p-1" title="Copy link"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg></button></div></td>
                      <td className="py-3 px-3 hidden lg:table-cell text-[var(--text-secondary)]"><div className="flex items-center gap-2">{l.userEmail ? <><Avatar email={l.userEmail} size={22} /><span className="truncate max-w-[120px]">{l.userEmail}</span></> : "Guest"}</div></td>
                      <td className="py-3 px-3 hidden md:table-cell max-w-[150px] truncate text-[var(--text-secondary)]">{l.originalUrl}</td>
                      <td className="py-3 px-3 text-center"><span className="neu-badge text-[var(--primary)]">{l.clickCount}</span></td>
                      <td className="py-3 px-3 text-center hidden sm:table-cell"><button onClick={() => handleToggleLink(l.id, l.isActive)} className={l.isActive ? "neu-badge text-[var(--success)] cursor-pointer" : "neu-badge text-[var(--danger)] cursor-pointer"}>{l.isActive ? "Active" : "Disabled"}</button></td>
                      <td className="py-3 px-3 text-center"><div className="flex items-center justify-center gap-2"><Link href={`/admin/dashboard/links/${l.id}`} className="neu-btn px-3 py-1.5 text-xs font-semibold text-[var(--primary)]">View</Link><button onClick={() => handleDeleteLink(l.id)} className="neu-btn px-3 py-1.5 text-xs font-semibold text-[var(--danger)]">Del</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "users" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6 animate-fade-in">
              <div className="neu-card !p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full" style={{ background: "var(--success)", boxShadow: "0 0 6px var(--success)" }} />
                  <h3 className="text-sm font-bold text-[var(--success)]">Online Users ({stats.onlineUsers})</h3>
                </div>
                {users.filter(u => u.isOnline).length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">No users currently online</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {users.filter(u => u.isOnline).map(u => (
                      <div key={u.userId} className="flex items-center gap-3 neu-pressed !p-3 !rounded-xl">
                        <Avatar email={u.email} size={28} tooltip />
                        <span className="text-sm font-semibold text-[var(--text)] truncate">{u.email}</span>
                        <span className="ml-auto text-xs text-[var(--text-secondary)]">{u.linkCount} links · {u.totalClicks} clicks</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="neu-card !p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full bg-[var(--shadow-dark)]" />
                  <h3 className="text-sm font-bold text-[var(--text-secondary)]">Offline Users ({stats.offlineUsers})</h3>
                </div>
                {users.filter(u => !u.isOnline).length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">No offline users</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {users.filter(u => !u.isOnline).map(u => (
                      <div key={u.userId} className="flex items-center gap-3 neu-pressed !p-3 !rounded-xl">
                        <Avatar email={u.email} size={28} tooltip />
                        <span className="text-sm font-semibold text-[var(--text-secondary)] truncate">{u.email}</span>
                        <span className="ml-auto text-xs text-[var(--text-secondary)]">
                          {u.lastSeen ? new Date(u.lastSeen).toLocaleString() : "Never"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="neu-card animate-fade-in overflow-x-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-[var(--text)]">All Users</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{stats.totalUsers} total · {stats.onlineUsers} online · {stats.offlineUsers} offline</p>
                </div>
                <button onClick={() => { fetchUsers(); fetchUserStats(); }} disabled={usersLoading} className="neu-btn px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">Refresh</button>
              </div>
              {users.length === 0 ? (
                <p className="text-center py-12 text-[var(--text-secondary)]">No registered users yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-[var(--text-secondary)]"><th className="pb-3 font-semibold px-3">User</th><th className="pb-3 font-semibold px-3 text-center">Links</th><th className="pb-3 font-semibold px-3 text-center">Clicks</th><th className="pb-3 font-semibold px-3 text-center hidden sm:table-cell">Status</th><th className="pb-3 font-semibold px-3 hidden md:table-cell">Last Seen</th><th className="pb-3 font-semibold px-3 text-center">Actions</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.userId} className="border-t border-[var(--shadow-dark)]/30">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <Avatar email={u.email} size={28} tooltip />
                            <p className="font-semibold text-[var(--text)] text-sm truncate max-w-[180px]">{u.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center"><span className="neu-badge">{u.linkCount}</span></td>
                        <td className="py-3 px-3 text-center"><span className="neu-badge text-[var(--primary)]">{u.totalClicks}</span></td>
                        <td className="py-3 px-3 text-center hidden sm:table-cell">
                          <span className={u.isOnline ? "neu-badge text-[var(--success)]" : "neu-badge text-[var(--text-secondary)]"}>
                            {u.isOnline ? "Online" : "Offline"}
                          </span>
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell text-[var(--text-secondary)] text-xs">{u.lastSeen ? new Date(u.lastSeen).toLocaleString() : "Never"}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleBan(u)} className="neu-btn px-3 py-1.5 text-xs font-semibold text-red-500">Ban</button>
                            <button onClick={() => handleUnban(u)} className="neu-btn px-3 py-1.5 text-xs font-semibold text-[var(--success)]">Unban</button>
                            <button onClick={() => handleDeleteUser(u)} className="neu-btn px-3 py-1.5 text-xs font-semibold text-[var(--danger)]">Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}