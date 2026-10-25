"use client";

import { useMemo, useState } from "react";
import { Download, Mail, Search, ShieldCheck, Users } from "lucide-react";

export type ConsultationRow = {
  id: number;
  name: string;
  email: string;
  company: string;
  teamSize: string;
  service: string;
  message: string;
  status: string;
  createdAt: string;
};

function csvCell(value: string | number) {
  return '"' + String(value).replaceAll('"', '""') + '"';
}

export function AdminDashboard({
  rows,
  displayName,
  databasePath,
}: {
  rows: ConsultationRow[];
  displayName: string;
  databasePath?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.name, row.email, row.company, row.service, row.message]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, rows]);

  function exportCsv() {
    const header = ["ID", "Name", "Email", "Company", "Team size", "Service", "Message", "Status", "Created"];
    const body = filtered.map((row) =>
      [row.id, row.name, row.email, row.company, row.teamSize, row.service, row.message, row.status, row.createdAt]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([[header.map(csvCell).join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "orbyte-consultation-requests-" + new Date().toISOString().slice(0, 10) + ".csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const uniqueServices = new Set(rows.map((row) => row.service)).size;

  return (
    <main className="min-h-screen bg-[#071018] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="flex flex-col justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end">
          <div>
            <a href="/" className="text-xs font-bold uppercase tracking-[.2em] text-[#c9ff5a]">← Orbyte Cloud</a>
            <h1 className="display mt-4 text-5xl font-black uppercase md:text-7xl">Consultation requests</h1>
            <p className="mt-3 text-white/50">Local lead dashboard · {displayName}</p>
            {databasePath && (
              <p className="mt-2 max-w-3xl break-all font-mono text-xs text-white/35">
                Database file: {databasePath}
              </p>
            )}
          </div>
          <a href="/" className="w-fit rounded-full border border-white/15 px-5 py-3 text-sm font-semibold hover:bg-white/10">View website</a>
        </header>

        <section className="grid gap-4 py-8 sm:grid-cols-3">
          {[
            { icon: Users, value: rows.length, label: "Total enquiries" },
            { icon: Mail, value: rows.filter((row) => row.status === "new").length, label: "New requests" },
            { icon: ShieldCheck, value: uniqueServices, label: "Services requested" },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-white/10 bg-white/[.05] p-6">
              <item.icon className="text-[#c9ff5a]" size={22} />
              <div className="mt-7 text-4xl font-black">{item.value}</div>
              <div className="mt-1 text-sm text-white/45">{item.label}</div>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.04]">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block flex-1 sm:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={18} />
              <span className="sr-only">Search requests</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, company, service…" className="w-full rounded-full border border-white/10 bg-[#0d1922] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#c9ff5a]" />
            </label>
            <button onClick={exportCsv} disabled={!filtered.length} className="flex items-center justify-center gap-2 rounded-full bg-[#c9ff5a] px-5 py-3 text-sm font-bold text-[#071018] disabled:opacity-40">
              <Download size={17} /> Export CSV
            </button>
          </div>

          {filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-black/20 text-xs uppercase tracking-[.12em] text-white/40">
                  <tr>{["Date", "Contact", "Company", "Team", "Service", "Message", "Status"].map((label) => <th key={label} className="px-5 py-4 font-semibold">{label}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {filtered.map((row) => (
                    <tr key={row.id} className="align-top hover:bg-white/[.035]">
                      <td className="whitespace-nowrap px-5 py-5 text-white/45">{row.createdAt.slice(0, 10).split("-").reverse().join("/")}</td>
                      <td className="px-5 py-5"><div className="font-semibold">{row.name}</div><a href={"mailto:" + row.email} className="mt-1 block text-[#79d9ff] hover:underline">{row.email}</a></td>
                      <td className="px-5 py-5 text-white/65">{row.company || "—"}</td>
                      <td className="px-5 py-5 text-white/65">{row.teamSize || "—"}</td>
                      <td className="px-5 py-5"><span className="inline-block rounded-full bg-[#c9ff5a]/10 px-3 py-1 text-xs font-semibold text-[#c9ff5a]">{row.service}</span></td>
                      <td className="max-w-sm px-5 py-5 leading-6 text-white/60">{row.message || "—"}</td>
                      <td className="px-5 py-5"><span className="rounded-full border border-white/15 px-3 py-1 text-xs capitalize">{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center text-white/45">{rows.length ? "No requests match your search." : "No consultation requests yet."}</div>
          )}
        </section>
      </div>
    </main>
  );
}
