"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { ThemeToggle } from "@/components/ThemeProvider";
import { UserMenu } from "@/components/UserMenu";

interface VisitorData {
  type: "click" | "visit";
  id: string;
  source: string;
  page: string | null;
  domain: string;
  ipAddress: string;
  userAgent: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: string;
  deviceVendor: string;
  deviceModel: string;
  screenResolution: string;
  language: string;
  referrer: string;
  country: string;
  city: string;
  isp: string;
  timestamp: string;
  linkId: string | null;
  shortCode: string | null;
  linkDomain: string | null;
  originalUrl: string | null;
  linkOwner: string | null;
}

interface AnalyticsItem {
  name: string;
  count: number;
}

interface AnalyticsData {
  browsers: AnalyticsItem[];
  countries: AnalyticsItem[];
  devices: AnalyticsItem[];
  referrers: AnalyticsItem[];
  os: AnalyticsItem[];
  cities: AnalyticsItem[];
  pages: AnalyticsItem[];
  domains: AnalyticsItem[];
}

const EXPORT_FIELDS = [
  { key: "type", label: "Type" },
  { key: "domain", label: "Domain" },
  { key: "source", label: "Source" },
  { key: "ipAddress", label: "IP Address" },
  { key: "userAgent", label: "User Agent" },
  { key: "browser", label: "Browser" },
  { key: "os", label: "OS" },
  { key: "deviceType", label: "Device" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "isp", label: "ISP" },
  { key: "referrer", label: "Referrer" },
  { key: "language", label: "Language" },
  { key: "screenResolution", label: "Screen" },
  { key: "clickedAt", label: "Time" },
] as const;

type ExportFieldKey = (typeof EXPORT_FIELDS)[number]["key"];

const DEFAULT_FIELDS: ExportFieldKey[] = ["type", "domain", "source", "ipAddress", "country", "deviceType", "clickedAt"];

function getFieldValue(v: VisitorData, key: ExportFieldKey): string {
  switch (key) {
    case "type": return v.type === "click" ? "Link Click" : "Page Visit";
    case "domain": return v.domain || "-";
    case "source": return v.source || "-";
    case "ipAddress": return v.ipAddress;
    case "userAgent": return v.userAgent || "-";
    case "browser": return `${v.browser} ${v.browserVersion}`;
    case "os": return v.os ? `${v.os} ${v.osVersion || ""}`.trim() : "-";
    case "deviceType": return v.deviceType || "desktop";
    case "country": return v.country || "-";
    case "city": return v.city || "-";
    case "isp": return v.isp || "-";
    case "referrer": return v.referrer || "Direct";
    case "language": return v.language || "-";
    case "screenResolution": return v.screenResolution || "-";
    case "clickedAt": return new Date(v.timestamp).toLocaleString();
  }
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function doExport(visitors: VisitorData[], selectedFields: ExportFieldKey[], format: "csv" | "xls" | "txt") {
  const headers = selectedFields.map(k => EXPORT_FIELDS.find(f => f.key === k)!.label);
  const rows = visitors.map(v => selectedFields.map(k => getFieldValue(v, k)));

  if (format === "csv") {
    const escaped = rows.map(r => r.map(v => '"' + v.replace(/"/g, '""') + '"'));
    downloadFile("all_visitors.csv", [headers.join(","), ...escaped.map(r => r.join(","))].join("\n"), "text/csv;charset=utf-8;");
  } else if (format === "xls") {
    downloadFile("all_visitors.xls", [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n"), "application/vnd.ms-excel;charset=utf-8;");
  } else {
    const lines = visitors.map(v => selectedFields.map(k => EXPORT_FIELDS.find(f => f.key === k)!.label + ": " + getFieldValue(v, k)).join("\n"));
    downloadFile("all_visitors.txt", lines.join("\n\n"), "text/plain;charset=utf-8;");
  }
}

export default function AdminVisitorsPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const { addToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [visitors, setVisitors] = useState<VisitorData[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [totalClicks, setTotalClicks] = useState(0);
  const [totalPageVisits, setTotalPageVisits] = useState(0);
  const [uniqueVisitors, setUniqueVisitors] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"visitors" | "analytics">("visitors");
  const [typeFilter, setTypeFilter] = useState<"all" | "click" | "visit">("all");
  const [expandedUA, setExpandedUA] = useState<Set<string>>(new Set());
  const [showExport, setShowExport] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<ExportFieldKey>>(new Set(DEFAULT_FIELDS));
  const [search, setSearch] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("all");

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/admin/visitors?limit=500");
    if (res.ok) {
      const d = await res.json();
      setVisitors(d.visitors || []);
      setAnalytics(d.analytics || null);
      setTotalClicks(d.totalClicks || 0);
      setTotalPageVisits(d.totalPageVisits || 0);
      setUniqueVisitors(d.uniqueVisitors || 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      if (!user) { router.push("/login"); return; }
      setUser(user);
      fetchData();
    });
  }, []);

  const toggleField = (key: ExportFieldKey) => {
    const next = new Set(selectedFields);
    if (next.has(key)) next.delete(key); else next.add(key);
    if (next.size === 0) return;
    setSelectedFields(next);
  };

  const filtered = visitors.filter(v => {
    if (typeFilter !== "all" && v.type !== typeFilter) return false;
    if (deviceFilter !== "all" && (v.deviceType || "desktop").toLowerCase() !== deviceFilter) return false;
    const s = search.toLowerCase();
    if (!s) return true;
    return (
      v.ipAddress?.toLowerCase().includes(s) ||
      v.browser?.toLowerCase().includes(s) ||
      v.os?.toLowerCase().includes(s) ||
      v.country?.toLowerCase().includes(s) ||
      v.city?.toLowerCase().includes(s) ||
      v.source?.toLowerCase().includes(s) ||
      v.userAgent?.toLowerCase().includes(s) ||
      v.isp?.toLowerCase().includes(s) ||
      v.linkOwner?.toLowerCase().includes(s) ||
      v.page?.toLowerCase().includes(s)
    );
  });

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
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard" className="neu-btn p-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-[var(--text)]"><span className="text-[var(--primary)]">All Visitors</span> Tracking</h1>
        </div>
        <div className="flex items-center gap-3">
          <UserMenu email={user?.email || ""} size={32} />
          <ThemeToggle />
        </div>
      </header>

      <main className="px-6 pb-10 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 animate-fade-in">
          <div className="neu-card !p-4 text-center">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Link Clicks</p>
            <p className="text-2xl font-bold text-[var(--primary)] mt-1">{totalClicks}</p>
          </div>
          <div className="neu-card !p-4 text-center">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Page Visits</p>
            <p className="text-2xl font-bold text-[var(--success)] mt-1">{totalPageVisits}</p>
          </div>
          <div className="neu-card !p-4 text-center">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Unique IPs</p>
            <p className="text-2xl font-bold text-[var(--text)] mt-1">{uniqueVisitors}</p>
          </div>
          <div className="neu-card !p-4 text-center">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Shown</p>
            <p className="text-2xl font-bold text-[var(--text-secondary)] mt-1">{visitors.length}</p>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button onClick={() => setTab("visitors")} className={tab === "visitors" ? "neu-primary-btn !py-2.5 !px-5 text-sm" : "neu-btn px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)]"}>Visitor Log</button>
          <button onClick={() => setTab("analytics")} className={tab === "analytics" ? "neu-primary-btn !py-2.5 !px-5 text-sm" : "neu-btn px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)]"}>Analytics</button>
          <button onClick={() => { fetchData(); addToast("success", "Refreshed"); }} className="neu-btn px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)]">Refresh</button>
        </div>

        {tab === "visitors" && (
          <>
            <div className="neu-card mb-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Search by IP, browser, country, ISP, page..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="neu-pressed !p-3 !rounded-xl flex-1 text-sm text-[var(--text)] bg-transparent outline-none placeholder:text-[var(--text-secondary)]"
                />
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value as "all" | "click" | "visit")}
                  className="neu-pressed !p-3 !rounded-xl text-sm text-[var(--text)] bg-transparent outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="click">Link Clicks</option>
                  <option value="visit">Page Visits</option>
                </select>
                <select
                  value={deviceFilter}
                  onChange={e => setDeviceFilter(e.target.value)}
                  className="neu-pressed !p-3 !rounded-xl text-sm text-[var(--text)] bg-transparent outline-none"
                >
                  <option value="all">All Devices</option>
                  <option value="mobile">Mobile</option>
                  <option value="tablet">Tablet</option>
                  <option value="desktop">Desktop</option>
                </select>
              </div>

              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[var(--text-secondary)]">{filtered.length} visitors shown</p>
                <button onClick={() => setShowExport(!showExport)} className="neu-btn px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                  {showExport ? "Hide Export" : "Export"}
                </button>
              </div>

              {showExport && (
                <div className="mb-4 neu-pressed !p-4 !rounded-xl">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Select columns:</p>
                  <div className="flex flex-wrap gap-2">
                    {EXPORT_FIELDS.map(f => (
                      <label key={f.key} className="flex items-center gap-1.5 cursor-pointer neu-btn !px-3 !py-1.5 text-xs">
                        <input type="checkbox" checked={selectedFields.has(f.key)} onChange={() => toggleField(f.key)} className="accent-[var(--primary)]" />
                        <span className="text-[var(--text)]">{f.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-3">
                    <button onClick={() => doExport(filtered, Array.from(selectedFields), "csv")} className="neu-btn px-4 py-2 text-sm font-semibold text-[var(--primary)]">CSV</button>
                    <button onClick={() => doExport(filtered, Array.from(selectedFields), "xls")} className="neu-btn px-4 py-2 text-sm font-semibold text-[var(--success)]">Excel</button>
                    <button onClick={() => doExport(filtered, Array.from(selectedFields), "txt")} className="neu-btn px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">TXT</button>
                  </div>
                </div>
              )}
            </div>

            <div className="neu-card animate-fade-in overflow-x-auto">
              {filtered.length === 0 ? (
                <p className="text-center py-8 text-[var(--text-secondary)]">No visitors found.</p>
              ) : (
                <table className="w-full text-sm min-w-[1200px]">
                  <thead>
                    <tr className="text-left text-[var(--text-secondary)]">
                      <th className="pb-3 font-semibold px-2">Type</th>
                      <th className="pb-3 font-semibold px-2">Time</th>
                      <th className="pb-3 font-semibold px-2">Domain</th>
                      <th className="pb-3 font-semibold px-2">Source / Page</th>
                      <th className="pb-3 font-semibold px-2">IP</th>
                      <th className="pb-3 font-semibold px-2">User Agent</th>
                      <th className="pb-3 font-semibold px-2">Browser</th>
                      <th className="pb-3 font-semibold px-2">OS</th>
                      <th className="pb-3 font-semibold px-2">Device</th>
                      <th className="pb-3 font-semibold px-2">Country</th>
                      <th className="pb-3 font-semibold px-2">City</th>
                      <th className="pb-3 font-semibold px-2">ISP</th>
                      <th className="pb-3 font-semibold px-2">Referrer</th>
                      <th className="pb-3 font-semibold px-2">Lang</th>
                      <th className="pb-3 font-semibold px-2">Screen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(v => {
                      const isExpanded = expandedUA.has(v.id);
                      const uaFull = v.userAgent || "-";
                      const uaShort = uaFull.length > 35 ? uaFull.slice(0, 35) + "..." : uaFull;
                      return (
                        <tr key={v.id} className="border-t border-[var(--shadow-dark)]/30 hover:bg-[var(--shadow-dark)]/5">
                          <td className="py-2.5 px-2">
                            <span className={v.type === "click" ? "neu-badge text-xs text-[var(--primary)]" : "neu-badge text-xs text-[var(--success)]"}>
                              {v.type === "click" ? "Click" : "Visit"}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-[var(--text-secondary)] whitespace-nowrap text-xs">{new Date(v.timestamp).toLocaleString()}</td>
                          <td className="py-2.5 px-2">
                            <span className="neu-badge text-xs text-[var(--primary)]">{v.domain || (v.type === "click" ? v.linkDomain || "dinka.shop" : "unknown")}</span>
                          </td>
                          <td className="py-2.5 px-2">
                            {v.type === "click" && v.shortCode ? (
                              <Link href={`/admin/dashboard/links/${v.linkId}`} className="text-[var(--primary)] font-semibold hover:underline text-xs">
                                {(v.linkDomain || "dinka.shop")}/s/{v.shortCode}
                              </Link>
                            ) : (
                              <span className="text-xs text-[var(--text-secondary)]">{v.page || v.source}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 font-mono text-xs text-[var(--text-secondary)]">{v.ipAddress}</td>
                          <td className="py-2.5 px-2 max-w-[160px]" title={uaFull}>
                            <span className="text-xs text-[var(--text-secondary)] cursor-pointer" onClick={() => { const s = new Set(expandedUA); isExpanded ? s.delete(v.id) : s.add(v.id); setExpandedUA(s); }}>
                              {isExpanded ? uaFull : uaShort}
                              {uaFull.length > 35 && <span className="text-[var(--primary)] ml-1">{isExpanded ? "less" : "more"}</span>}
                            </span>
                          </td>
                          <td className="py-2.5 px-2"><span className="neu-badge text-xs">{v.browser} {v.browserVersion}</span></td>
                          <td className="py-2.5 px-2 text-xs text-[var(--text-secondary)]">{v.os} {v.osVersion || ""}</td>
                          <td className="py-2.5 px-2">
                            <span className={`neu-badge text-xs ${v.deviceType === "mobile" ? "text-[var(--primary)]" : v.deviceType === "tablet" ? "text-[var(--success)]" : "text-[var(--text-secondary)]"}`}>
                              {v.deviceType || "desktop"}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-xs text-[var(--text-secondary)]">{v.country}</td>
                          <td className="py-2.5 px-2 text-xs text-[var(--text-secondary)]">{v.city}</td>
                          <td className="py-2.5 px-2 text-xs text-[var(--text-secondary)]">{v.isp}</td>
                          <td className="py-2.5 px-2 text-xs text-[var(--text-secondary)] max-w-[80px] truncate" title={v.referrer || "Direct"}>{v.referrer || "Direct"}</td>
                          <td className="py-2.5 px-2 text-xs text-[var(--text-secondary)]">{v.language}</td>
                          <td className="py-2.5 px-2 text-xs text-[var(--text-secondary)]">{v.screenResolution}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {tab === "analytics" && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="neu-card !p-6">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Domains</h3>
              {analytics.domains.map(d => (
                <div key={d.name} className="flex justify-between py-2 border-t border-[var(--shadow-dark)]/20 first:border-0">
                  <span className="text-sm text-[var(--text)]">{d.name}</span>
                  <span className="neu-badge text-xs">{d.count}</span>
                </div>
              ))}
            </div>
            <div className="neu-card !p-6">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Browsers</h3>
              {analytics.browsers.slice(0, 10).map(b => (
                <div key={b.name} className="flex justify-between py-2 border-t border-[var(--shadow-dark)]/20 first:border-0">
                  <span className="text-sm text-[var(--text)]">{b.name}</span>
                  <span className="neu-badge text-xs">{b.count}</span>
                </div>
              ))}
            </div>
            <div className="neu-card !p-6">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Countries</h3>
              {analytics.countries.slice(0, 10).map(c => (
                <div key={c.name} className="flex justify-between py-2 border-t border-[var(--shadow-dark)]/20 first:border-0">
                  <span className="text-sm text-[var(--text)]">{c.name}</span>
                  <span className="neu-badge text-xs">{c.count}</span>
                </div>
              ))}
            </div>
            <div className="neu-card !p-6">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Devices</h3>
              {analytics.devices.map(d => (
                <div key={d.name} className="flex justify-between py-2 border-t border-[var(--shadow-dark)]/20 first:border-0">
                  <span className="text-sm text-[var(--text)] capitalize">{d.name}</span>
                  <span className="neu-badge text-xs">{d.count}</span>
                </div>
              ))}
            </div>
            <div className="neu-card !p-6">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Operating Systems</h3>
              {analytics.os.slice(0, 10).map(o => (
                <div key={o.name} className="flex justify-between py-2 border-t border-[var(--shadow-dark)]/20 first:border-0">
                  <span className="text-sm text-[var(--text)]">{o.name}</span>
                  <span className="neu-badge text-xs">{o.count}</span>
                </div>
              ))}
            </div>
            <div className="neu-card !p-6">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Top Referrers</h3>
              {analytics.referrers.slice(0, 10).map(r => (
                <div key={r.name} className="flex justify-between py-2 border-t border-[var(--shadow-dark)]/20 first:border-0">
                  <span className="text-sm text-[var(--text)] truncate max-w-[80%]">{r.name}</span>
                  <span className="neu-badge text-xs">{r.count}</span>
                </div>
              ))}
            </div>
            <div className="neu-card !p-6">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Top Pages</h3>
              {analytics.pages.slice(0, 10).map(p => (
                <div key={p.name} className="flex justify-between py-2 border-t border-[var(--shadow-dark)]/20 first:border-0">
                  <span className="text-sm text-[var(--text)] truncate max-w-[80%]">{p.name}</span>
                  <span className="neu-badge text-xs">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}