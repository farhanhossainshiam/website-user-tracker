"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { ThemeToggle } from "@/components/ThemeProvider";

interface ClickData {
  id: string;
  ipAddress: string;
  userAgent: string;
  browser: string;
  browserVersion: string;
  os: string;
  deviceType: string;
  screenResolution: string;
  language: string;
  referrer: string;
  country: string;
  city: string;
  isp: string;
  clickedAt: string;
}

interface LinkDetail {
  id: string;
  shortCode: string;
  originalUrl: string;
  clickCount: number;
  createdAt: string;
  isActive: boolean;
  domain: string | null;
  clicks: ClickData[];
}

const EXPORT_FIELDS = [
  { key: "ipAddress", label: "IP Address" },
  { key: "userAgent", label: "User Agent" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
  { key: "browser", label: "Browser" },
  { key: "os", label: "OS" },
  { key: "deviceType", label: "Device" },
  { key: "isp", label: "ISP" },
  { key: "language", label: "Language" },
  { key: "screenResolution", label: "Screen" },
  { key: "clickedAt", label: "Time" },
  
] as const;

type ExportFieldKey = typeof EXPORT_FIELDS[number]["key"];

const DEFAULT_FIELDS: ExportFieldKey[] = ["ipAddress", "userAgent", "city"];

function getFieldValue(c: ClickData, key: ExportFieldKey): string {
  switch (key) {
    case "ipAddress": return c.ipAddress;
    case "userAgent": return c.userAgent || "-";
    case "city": return c.city || "-";
    case "country": return c.country || "-";
    case "browser": return `${c.browser} ${c.browserVersion}`;
    case "os": return c.os || "-";
    case "deviceType": return c.deviceType || "-";
    case "isp": return c.isp || "-";
    case "language": return c.language || "-";
    case "screenResolution": return c.screenResolution || "-";
    case "clickedAt": return new Date(c.clickedAt).toLocaleString();
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

function doExport(data: LinkDetail, selectedFields: ExportFieldKey[], format: "csv" | "xls" | "txt") {
  const headers = selectedFields.map(k => EXPORT_FIELDS.find(f => f.key === k)!.label);
  const rows = data.clicks.map(c => selectedFields.map(k => getFieldValue(c, k)));
  const shortCode = data.shortCode;

  if (format === "csv") {
    const escaped = rows.map(r => r.map(v => '"' + v.replace(/"/g, '""') + '"'));
    downloadFile(shortCode + "_clicks.csv", [headers.join(","), ...escaped.map(r => r.join(","))].join("\n"), "text/csv;charset=utf-8;");
  } else if (format === "xls") {
    downloadFile(shortCode + "_clicks.xls", [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n"), "application/vnd.ms-excel;charset=utf-8;");
  } else {
    const lines = data.clicks.map(c => selectedFields.map(k => EXPORT_FIELDS.find(f => f.key === k)!.label + ": " + getFieldValue(c, k)).join("\n"));
    downloadFile(shortCode + "_clicks.txt", lines.join("\n\n"), "text/plain;charset=utf-8;");
  }
}

export default function UserLinkDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createBrowserClient();
  const { addToast } = useToast();
  const id = params.id as string;
  const [data, setData] = useState<LinkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"clicks" | "analytics">("clicks");
  const [expandedUA, setExpandedUA] = useState<Set<string>>(new Set());
  const [showExport, setShowExport] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<ExportFieldKey>>(new Set(DEFAULT_FIELDS));

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      if (!user) { router.push("/login"); return; }
      fetchDetail();
    });
  }, []);

  const fetchDetail = async () => {
    const res = await fetch("/api/links/" + id);
    if (res.ok) setData(await res.json());
    else { addToast("error", "Link not found"); router.push("/dashboard"); }
    setLoading(false);
  };

  const toggleField = (key: ExportFieldKey) => {
    const next = new Set(selectedFields);
    if (next.has(key)) next.delete(key); else next.add(key);
    if (next.size === 0) return;
    setSelectedFields(next);
  };

  const handleToggle = async () => {
    if (!data) return;
    const res = await fetch("/api/links/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !data.isActive }),
    });
    if (res.ok) {
      setData({ ...data, isActive: !data.isActive });
      addToast("success", data.isActive ? "Link disabled" : "Link enabled");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this link and all its click data?")) return;
    const res = await fetch("/api/links/" + id, { method: "DELETE" });
    if (res.ok) { addToast("success", "Link deleted"); router.push("/dashboard"); }
    else addToast("error", "Failed to delete");
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

  if (!data) return null;

  const uniqueDevices = new Set(data.clicks.map((c) => c.ipAddress)).size;
  const browsers = data.clicks.reduce((acc: Record<string, number>, c) => { acc[c.browser || "Unknown"] = (acc[c.browser || "Unknown"] || 0) + 1; return acc; }, {});
  const countries = data.clicks.reduce((acc: Record<string, number>, c) => { acc[c.country || "Unknown"] = (acc[c.country || "Unknown"] || 0) + 1; return acc; }, {});
  const devices = data.clicks.reduce((acc: Record<string, number>, c) => { acc[c.deviceType || "desktop"] = (acc[c.deviceType || "desktop"] || 0) + 1; return acc; }, {});

  return (
    <div className="min-h-screen neu-bg">
      <header className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="neu-btn p-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-[var(--text)]">Link Analytics</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="px-6 pb-10 max-w-7xl mx-auto">
        <div className="neu-card mb-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Short Link</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-[var(--primary)]">{data.domain ? data.domain : process.env.NEXT_PUBLIC_BASE_URL?.replace("https://", "")}/s/{data.shortCode}</p>
                <button onClick={() => { navigator.clipboard.writeText((data.domain ? "https://" + data.domain : process.env.NEXT_PUBLIC_BASE_URL) + "/s/" + data.shortCode); addToast("success", "Copied!"); }} className="neu-btn p-1" title="Copy link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center"><p className="text-xs text-[var(--text-secondary)]">Clicks</p><p className="text-2xl font-bold text-[var(--primary)]">{data.clickCount}</p></div>
              <div className="text-center"><p className="text-xs text-[var(--text-secondary)]">Unique</p><p className="text-2xl font-bold text-[var(--success)]">{uniqueDevices}</p></div>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)] truncate mb-4">Destination: {data.originalUrl}</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleToggle} className={data.isActive ? "neu-btn px-4 py-2 text-sm font-semibold text-[var(--success)]" : "neu-btn px-4 py-2 text-sm font-semibold text-[var(--danger)]"}>
              {data.isActive ? "Active - Click to Disable" : "Disabled - Click to Enable"}
            </button>
            <button onClick={handleDelete} className="neu-btn px-4 py-2 text-sm font-semibold text-[var(--danger)]">Delete Link</button>
          </div>
        </div>

        {data.clicks.length > 0 && (
          <div className="neu-card mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--text)]">Export Click Data</h3>
              <button onClick={() => setShowExport(!showExport)} className="neu-btn px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                {showExport ? "Hide" : "Select Fields"}
              </button>
            </div>

            {showExport && (
              <div className="mb-4 neu-pressed !p-4 !rounded-xl">
                <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Select columns to include:</p>
                <div className="flex flex-wrap gap-2">
                  {EXPORT_FIELDS.map(f => (
                    <label key={f.key} className="flex items-center gap-1.5 cursor-pointer neu-btn !px-3 !py-1.5 text-xs">
                      <input type="checkbox" checked={selectedFields.has(f.key)} onChange={() => toggleField(f.key)} className="accent-[var(--primary)]" />
                      <span className="text-[var(--text)]">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button onClick={() => doExport(data, Array.from(selectedFields), "csv")} className="neu-btn px-4 py-2 text-sm font-semibold text-[var(--primary)]">CSV</button>
              <button onClick={() => doExport(data, Array.from(selectedFields), "xls")} className="neu-btn px-4 py-2 text-sm font-semibold text-[var(--success)]">Excel</button>
              <button onClick={() => doExport(data, Array.from(selectedFields), "txt")} className="neu-btn px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">TXT</button>
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-6">
          <button onClick={() => setActiveTab("clicks")} className={activeTab === "clicks" ? "neu-primary-btn !py-2.5 !px-5 text-sm" : "neu-btn px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)]"}>Click History</button>
          <button onClick={() => setActiveTab("analytics")} className={activeTab === "analytics" ? "neu-primary-btn !py-2.5 !px-5 text-sm" : "neu-btn px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)]"}>Analytics</button>
        </div>

        {activeTab === "clicks" && (
          <div className="neu-card animate-fade-in overflow-x-auto">
            {data.clicks.length === 0 ? (
              <p className="text-center py-8 text-[var(--text-secondary)]">No clicks recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="text-left text-[var(--text-secondary)]">
                      <th className="pb-3 font-semibold px-2">Time</th>
                      <th className="pb-3 font-semibold px-2">IP</th>
                      <th className="pb-3 font-semibold px-2">User Agent</th>
                      <th className="pb-3 font-semibold px-2">Browser</th>
                      <th className="pb-3 font-semibold px-2">OS</th>
                      <th className="pb-3 font-semibold px-2">Device</th>
                      <th className="pb-3 font-semibold px-2">Country</th>
                      <th className="pb-3 font-semibold px-2">City</th>
                      <th className="pb-3 font-semibold px-2">ISP</th>
                      <th className="pb-3 font-semibold px-2">Language</th>
                      <th className="pb-3 font-semibold px-2">Screen</th>
                      
                    </tr>
                  </thead>
                  <tbody>
                    {data.clicks.map((click) => {
                      const isExpanded = expandedUA.has(click.id);
                      const uaFull = click.userAgent || "-";
                      const uaShort = uaFull.length > 50 ? uaFull.slice(0, 50) + "..." : uaFull;
                      return (
                        <tr key={click.id} className="border-t border-[var(--shadow-dark)]/30">
                          <td className="py-2.5 px-2 text-[var(--text-secondary)] whitespace-nowrap">{new Date(click.clickedAt).toLocaleString()}</td>
                          <td className="py-2.5 px-2 font-mono text-xs text-[var(--text-secondary)]">{click.ipAddress}</td>
                          <td className="py-2.5 px-2 max-w-[200px]" title={uaFull}>
                            <span className="text-xs text-[var(--text-secondary)] cursor-pointer" onClick={() => { const s = new Set(expandedUA); isExpanded ? s.delete(click.id) : s.add(click.id); setExpandedUA(s); }}>
                              {isExpanded ? uaFull : uaShort}
                              {uaFull.length > 50 && <span className="text-[var(--primary)] ml-1">{isExpanded ? "less" : "more"}</span>}
                            </span>
                          </td>
                          <td className="py-2.5 px-2"><span className="neu-badge text-xs">{click.browser} {click.browserVersion}</span></td>
                          <td className="py-2.5 px-2 text-[var(--text-secondary)]">{click.os}</td>
                          <td className="py-2.5 px-2"><span className={"neu-badge text-xs " + (click.deviceType === "mobile" ? "text-[var(--primary)]" : click.deviceType === "tablet" ? "text-[var(--success)]" : "text-[var(--text-secondary)]")}>{click.deviceType}</span></td>
                          <td className="py-2.5 px-2 text-[var(--text-secondary)]">{click.country}</td>
                          <td className="py-2.5 px-2 text-[var(--text-secondary)]">{click.city}</td>
                          <td className="py-2.5 px-2 text-[var(--text-secondary)]">{click.isp}</td>
                          <td className="py-2.5 px-2 text-[var(--text-secondary)]">{click.language}</td>
                          <td className="py-2.5 px-2 text-[var(--text-secondary)]">{click.screenResolution}</td>
                          
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            <div className="neu-card !p-6">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Browsers</h3>
              {Object.keys(browsers).length === 0 ? <p className="text-sm text-[var(--text-secondary)]">No data yet</p> : Object.entries(browsers).sort(([,a],[,b]) => b-a).map(([n,c]) => (
                <div key={n} className="flex justify-between py-2 border-t border-[var(--shadow-dark)]/20 first:border-0"><span className="text-sm">{n}</span><span className="neu-badge text-xs">{c}</span></div>
              ))}
            </div>
            <div className="neu-card !p-6">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Countries</h3>
              {Object.keys(countries).length === 0 ? <p className="text-sm text-[var(--text-secondary)]">No data yet</p> : Object.entries(countries).sort(([,a],[,b]) => b-a).map(([n,c]) => (
                <div key={n} className="flex justify-between py-2 border-t border-[var(--shadow-dark)]/20 first:border-0"><span className="text-sm">{n}</span><span className="neu-badge text-xs">{c}</span></div>
              ))}
            </div>
            <div className="neu-card !p-6">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Devices</h3>
              {Object.keys(devices).length === 0 ? <p className="text-sm text-[var(--text-secondary)]">No data yet</p> : Object.entries(devices).sort(([,a],[,b]) => b-a).map(([n,c]) => (
                <div key={n} className="flex justify-between py-2 border-t border-[var(--shadow-dark)]/20 first:border-0"><span className="text-sm capitalize">{n}</span><span className="neu-badge text-xs">{c}</span></div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}