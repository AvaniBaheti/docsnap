"use client";
import { useMemo, useState } from "react";
import type { DocCollection, DocRequest } from "@/lib/types";

function methodBadge(method: string) {
  const base = "text-[11px] font-semibold px-2 py-0.5 rounded";
  const map: Record<string, string> = {
    GET: "bg-green-100 text-green-700",
    POST: "bg-blue-100 text-blue-700",
    PUT: "bg-yellow-100 text-yellow-700",
    PATCH: "bg-purple-100 text-purple-700",
    DELETE: "bg-red-100 text-red-700",
    HEAD: "bg-gray-100 text-gray-700",
    OPTIONS: "bg-gray-100 text-gray-700",
  };
  return `${base} ${map[method] ?? "bg-gray-100 text-gray-700"}`;
}

export default function Home() {
  const [doc, setDoc] = useState<DocCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  async function importByUid(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const uid = String(form.get("uid") || "").trim();
    try {
      const res = await fetch("/api/import/postman", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "remote", collectionUid: uid }),
      });

      // robust parsing to avoid "Unexpected end of JSON input"
      const raw = await res.text();
      let j: any = {};
      try { j = raw ? JSON.parse(raw) : {}; } catch { /* ignore */ }

      if (!res.ok) throw new Error(j?.error || `Import failed (${res.status})`);
      setDoc(j.doc);
      setOpenId(null);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const exportPDF = async () => {
    if (!doc) return;
  
    const res = await fetch("/api/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responseData: doc }), // Send the response data to the server
    });
  
    if (res.ok) {
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${doc.name}.pdf`; // Filename for PDF
      link.click(); // Trigger the download
    } else {
      alert("Failed to export PDF");
    }
  };
  

  const grouped = useMemo(() => {
    if (!doc) return {} as Record<string, DocRequest[]>;
    const g: Record<string, DocRequest[]> = {};
    doc.items.forEach((r) => {
      const folder = r.folderPath.join(" / ") || "General";
      (g[folder] ||= []).push(r);
    });
    Object.values(g).forEach((arr) => arr.sort((a, b) => a.name.localeCompare(b.name)));
    return g;
  }, [doc]);

  const filtered = useMemo(() => {
    if (!doc) return grouped;
    if (!filter.trim()) return grouped;
    const q = filter.toLowerCase();
    const out: Record<string, DocRequest[]> = {};
    for (const [folder, items] of Object.entries(grouped)) {
      const hit = items.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.url.toLowerCase().includes(q) ||
          r.method.toLowerCase().includes(q)
      );
      if (hit.length) out[folder] = hit;
    }
    return out;
  }, [grouped, filter, doc]);

  return (
    <main className="mx-auto max-w-7xl p-6 mt-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-4xl font-bold">DocSnap</h1>
        <div className="flex items-center gap-2">
          <form onSubmit={importByUid} className="flex items-center gap-2">
            <input
              name="uid"
              placeholder="Collection UID"
              className="w-64 border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              disabled={loading}
              className="rounded bg-black px-3 py-2 text-sm text-white transition hover:bg-gray-800 disabled:opacity-50"
              title="Import with Postman API"
            >
              {loading ? "Importing..." : "Import"}
            </button>
          </form>
        </div>
      </header>

      {err && (
        <div className="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </div>
      )}

      {doc ? (
        <>
          <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">{doc.name}</h2>
            <div className="flex items-center gap-2">
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search (name, url, method)…"
                className="w-64 rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={exportPDF}
                className="rounded border px-3 py-2 text-sm transition hover:bg-gray-50"
                title="Export as PDF"
              >
                Export PDF
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className="sticky top-4 rounded border bg-white">
                <div className="border-b px-3 py-2 text-sm font-medium">Folders</div>
                <ul className="max-h-[60vh] overflow-auto p-2 text-sm">
                  {Object.keys(filtered).length === 0 && (
                    <li className="px-2 py-1 text-gray-500">No results</li>
                  )}
                  {Object.keys(filtered)
                    .sort()
                    .map((folder) => (
                      <li key={folder}>
                        <a
                          href={`#${encodeURIComponent(folder)}`}
                          className="block rounded px-2 py-1 transition hover:bg-gray-50"
                          title={folder}
                        >
                          {folder}
                        </a>
                      </li>
                    ))}
                </ul>
              </div>
            </aside>

            {/* Content */}
            <section className="lg:col-span-3">
              {Object.entries(filtered)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([folder, items]) => (
                  <div key={folder} id={encodeURIComponent(folder)} className="mb-10">
                    <h3 className="mb-3 text-lg font-semibold">{folder}</h3>

                    {items.map((r) => {
                      const open = openId === r.id;
                      return (
                        <article
                          key={r.id}
                          className={`mb-3 rounded border transition ${open
                              ? "border-blue-400 shadow-md"
                              : "hover:border-blue-300 hover:shadow-sm"
                            }`}
                        >
                          <button
                            onClick={() => setOpenId(open ? null : r.id)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                            title="Click to expand"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className={methodBadge(r.method)}>{r.method}</span>
                              <div className="truncate">
                                <div className="truncate text-sm font-medium">{r.name}</div>
                                <code className="block truncate text-xs text-gray-500">{r.url}</code>
                              </div>
                            </div>
                            <span
                              className={`text-xs transition ${open ? "rotate-180" : ""
                                }`}
                            >
                              ▾
                            </span>
                          </button>

                          {open && (
                            <div className="px-4 pb-4">
                              {/* Description */}
                              {r.description && (
                                <p className="whitespace-pre-wrap rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                  {r.description}
                                </p>
                              )}

                              {/* Path Vars */}
                              {r.pathVariables && Object.keys(r.pathVariables).length > 0 && (
                                <div className="mt-12">
                                  <h4 className="text-sm font-medium">Path Variables</h4>
                                  <table className="mt-1 w-full text-sm">
                                    <thead>
                                      <tr className="text-left text-gray-500">
                                        <th className="py-1">Key</th>
                                        <th>Value</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {Object.entries(r.pathVariables).map(([k, v]) => (
                                        <tr key={k} className="border-t">
                                          <td className="py-1 align-top">
                                            <code>{k}</code>
                                          </td>
                                          <td className="align-top">{String(v ?? "")}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Query */}
                              {r.query?.length ? (
                                <div className="mt-3">
                                  <h4 className="text-sm font-medium">Query Params</h4>
                                  <table className="mt-1 w-full text-sm">
                                    <thead>
                                      <tr className="text-left text-gray-500">
                                        <th className="py-1">Key</th>
                                        <th className="px-4">Value</th>
                                        <th>Description</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {r.query.map((p) => (
                                        <tr key={p.key} className="border-t">
                                          <td className="py-1 align-top">
                                            <code>{p.key}</code>
                                          </td>
                                          <td className="align-top break-all px-4">{p.value ?? ""}</td>
                                          <td className="align-top">{p.description ?? ""}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : null}

                              {/* Headers */}
                              {r.headers?.length ? (
                                <div className="mt-12">
                                  <h4 className="text-sm font-semibold">Headers</h4>
                                  <table className="mt-1 w-full text-sm">
                                    <thead>
                                      <tr className="text-left text-gray-500">
                                        <th className="py-1">Header</th>
                                        <th className="px-4">Value</th>
                                        <th>Description</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {r.headers.map((h) => (
                                        <tr key={h.key} className="border-t bg-gray-100 hover:bg-gray-200">
                                          <td className="py-1 align-top">
                                            <code>{h.key}</code>
                                          </td>
                                          <td className="align-top break-all px-4">{h.value ?? ""}</td>
                                          <td className="align-top">{h.description ?? ""}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : null}

                              {/* Body */}
                              {r.body?.mode && (
                                <div className="mt-12">
                                  <h4 className="text-sm font-semibold">Body ({r.body.mode})</h4>
                                  {r.body.mode === "raw" && r.body.raw ? (
                                    <pre className="mt-1 max-h-80 overflow-auto rounded border bg-gray-50 p-3 text-xs">
                                      {r.body.raw}
                                    </pre>
                                  ) : null}
                                  {r.body.mode === "urlencoded" && r.body.urlencoded?.length ? (
                                    <table className="mt-1 w-full text-sm">
                                      <thead>
                                        <tr className="text-left text-gray-500">
                                          <th className="py-1">Key</th>
                                          <th className="px-4">Value</th>
                                          <th>Description</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {r.body.urlencoded.map((p) => (
                                          <tr key={p.key} className="border-t">
                                            <td className="py-1 align-top">
                                              <code>{p.key}</code>
                                            </td>
                                            <td className="align-top break-all px-4">{p.value ?? ""}</td>
                                            <td className="align-top">{p.description ?? ""}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : null}
                                  {r.body.mode === "formdata" && r.body.formdata?.length ? (
                                    <table className="mt-1 w-full text-sm">
                                      <thead>
                                        <tr className="text-left text-gray-500">
                                          <th className="py-1">Key</th>
                                          <th className="px-4">Value</th>
                                          <th>Description</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {r.body.formdata.map((p) => (
                                          <tr key={p.key} className="border-t">
                                            <td className="py-1 align-top">
                                              <code>{p.key}</code>
                                            </td>
                                            <td className="align-top break-all px-4">{p.value ?? ""}</td>
                                            <td className="align-top">{p.description ?? ""}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : null}
                                </div>
                              )}

                              {/* Response */}
                              {r.response?.length ? (
                                <div className="mt-12">
                                  <h4 className="text-sm font-semibold">Response</h4>
                                  {r.response.map((resp, index) => {
                                    // Parse the response body (which is a string) into an object
                                    let parsedBody: Record<string, any> = {};
                                    try {
                                      parsedBody = JSON.parse(resp.body);  // Parse the body string into a JavaScript object
                                    } catch (error) {
                                      console.error('Error parsing response body:', error);
                                    }

                                    // Convert the parsed object back into a JSON string with pretty print
                                    const jsonDisplay = JSON.stringify(parsedBody, null, 2); // The `null, 2` adds indentation for readability

                                    return (
                                      <div key={index} className="border-t mt-2 pt-2">
                                        <h5 className="font-medium">Response {index + 1}</h5>

                                        {/* Display the JSON object as a string */}
                                        <div className="response-container">
                                          <pre className="bg-gray-50 p-3 text-xs overflow-auto whitespace-pre-wrap">{jsonDisplay}</pre>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div>No response data available</div>
                              )}

                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ))}
            </section>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center mt-20">
        <img src="/no_data.png" alt="No Data Found" className="w-512 h-96 object-contain" />
        <p className="mt-8 text-xl text-gray-800">
          Import a Postman collection by UID.
        </p>
      </div>
      )}
    </main>
  );
}
