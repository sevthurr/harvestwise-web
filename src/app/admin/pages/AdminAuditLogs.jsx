/**
 * AdminAuditLogs.jsx
 *
 * Displays the audit trail from the `logs` table.
 *
 * DB schema (logs):
 *   id          VARCHAR(15)   LOG-xxxx
 *   user_id     VARCHAR(15)   FK to users.id
 *   action      VARCHAR(100)  dot-notation, e.g. "user.login", "import.file_upload"
 *   details     TEXT nullable  free-form description
 *   ip_address  VARCHAR(45) nullable
 *   created_at  DATETIME
 *
 * API (query_logs):
 *   GET /api/admin/logs
 *   ?user_id=&action=&date_from=&date_to=&page=1&page_size=20
 *   Returns: { items: LogResponse[], total, page, page_size }
 *
 * NOTE: actor display name is resolved from user_id by the backend;
 * the response item should include a resolved `actor_name` field once
 * the backend endpoint is wired up.
 */

import { useState } from "react";
import {
  Search,
  Download,
  ClipboardList,
  ChevronDown,
  RotateCcw,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  FileText,
  Eye
} from "lucide-react";
import { PageHeader } from "../../global/components/shared/PageHeader";

// ─── Action colour mapping ─────────────────────────────────────────────────
// Actions follow dot-notation: "<resource>.<verb>"
// Colours are keyed by the resource prefix (first segment).

const RESOURCE_COLORS = {
  user:       { bg: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-200" },
  auth:       { bg: "bg-blue-50",     text: "text-blue-700",     border: "border-blue-200"    },
  import:     { bg: "bg-indigo-50",   text: "text-indigo-700",   border: "border-indigo-200"  },
  advisory:   { bg: "bg-purple-50",   text: "text-purple-700",   border: "border-purple-200"  },
  config:     { bg: "bg-orange-50",   text: "text-orange-700",   border: "border-orange-200"  },
  processing: { bg: "bg-cyan-50",     text: "text-cyan-700",     border: "border-cyan-200"    },
  data:       { bg: "bg-teal-50",     text: "text-teal-700",     border: "border-teal-200"    },
  system:     { bg: "bg-slate-50",    text: "text-slate-600",    border: "border-slate-200"   },
};

const FALLBACK_COLOR = {
  bg: "bg-[var(--hw-neutral-50)]",
  text: "text-[var(--hw-neutral-700)]",
  border: "border-[var(--hw-neutral-200)]"
};

function getActionColor(action = "") {
  const prefix = action.split(".")[0].toLowerCase();
  return RESOURCE_COLORS[prefix] || FALLBACK_COLOR;
}

// ─── Components ───────────────────────────────────────────────────────────────

function ActionBadge({ action }) {
  const c = getActionColor(action);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border font-mono ${c.bg} ${c.text} ${c.border}`}
    >
      {action}
    </span>
  );
}

function FilterSelect({ label, id, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white border border-[var(--hw-neutral-200)] rounded-xl px-3 pr-8 py-2 text-[13px] text-black focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-400)] cursor-pointer"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--hw-neutral-400)] pointer-events-none" />
    </div>
  );
}

function EmptyState({ filtered }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center max-w-xs mx-auto">
      <div className="w-12 h-12 rounded-2xl bg-[var(--hw-neutral-100)] flex items-center justify-center">
        <ClipboardList className="w-6 h-6 text-[var(--hw-neutral-400)]" />
      </div>
      <div>
        <p className="text-[14px] font-semibold text-[var(--hw-neutral-700)]">
          {filtered ? "No matching logs" : "No audit logs yet"}
        </p>
        <p className="text-[12px] text-[var(--hw-neutral-500)] mt-1">
          {filtered
            ? "Try adjusting your filters to find what you're looking for."
            : "Admin actions will be recorded here automatically once the backend is connected."}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Action filter options based on known dot-notation resource prefixes
const ACTION_FILTER_OPTIONS = [
  { value: "",           label: "All Actions"   },
  { value: "user",       label: "User"          },
  { value: "auth",       label: "Auth"          },
  { value: "import",     label: "Import"        },
  { value: "advisory",   label: "Advisory"      },
  { value: "config",     label: "Config"        },
  { value: "processing", label: "Processing"    },
  { value: "data",       label: "Data"          },
  { value: "system",     label: "System"        },
];

const PAGE_SIZE = 20;

function AdminAuditLogs() {
  // ── Filter state ─────────────────────────────────────────────────────────
  const [search, setSearch]         = useState("");   // maps to action ilike
  const [actionPrefix, setPrefix]   = useState("");   // resource prefix filter
  const [dateFrom, setDateFrom]     = useState("");   // ISO date string
  const [dateTo, setDateTo]         = useState("");   // ISO date string
  const [page, setPage]             = useState(1);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ── Data state (empty until backend wired) ───────────────────────────────
  // Shape: { items: LogResponse[], total: number, page: number, page_size: number }
  // LogResponse: { id, user_id, action, details, ip_address, created_at }
  // NOTE: backend should also return actor_name (resolved from user_id join)
  const [data] = useState({ items: [], total: 0, page: 1, page_size: PAGE_SIZE });

  const hasFilters = search.trim() !== "" || actionPrefix !== "" || dateFrom !== "" || dateTo !== "";

  const handleReset = () => {
    setSearch("");
    setPrefix("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  // Format ISO datetime for display
  function fmtDatetime(isoStr) {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("en-PH", {
        year: "numeric", month: "short", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: true
      });
    } catch {
      return isoStr;
    }
  }

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto">
      {/* ── Header ── */}
      <div className="mb-5">
        <PageHeader
          title="Audit Logs"
          description="View and track system events and administrative actions."
        />
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 mb-4">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search → maps to action ilike filter */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--hw-neutral-400)]" />
            <input
              id="audit-search"
              type="text"
              placeholder="Search action (e.g. user.login)…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-400)]"
            />
          </div>

          {/* Resource prefix filter */}
          <FilterSelect
            id="audit-action-filter"
            label="Action category"
            value={actionPrefix}
            onChange={(v) => { setPrefix(v); setPage(1); }}
            options={ACTION_FILTER_OPTIONS}
          />

          {/* Date range */}
          <input
            id="audit-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            aria-label="Date from"
            className="bg-white border border-[var(--hw-neutral-200)] rounded-xl px-3 py-2 text-[13px] text-black focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-400)]"
          />
          <span className="text-[12px] text-[var(--hw-neutral-400)]">to</span>
          <input
            id="audit-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            aria-label="Date to"
            className="bg-white border border-[var(--hw-neutral-200)] rounded-xl px-3 py-2 text-[13px] text-black focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-400)]"
          />

          {hasFilters && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[var(--hw-neutral-600)] hover:text-black border border-[var(--hw-neutral-200)] rounded-xl bg-white hover:bg-[var(--hw-neutral-50)] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}

          {/* Export PDF dropdown inside filter container */}
          <div className="relative ml-auto">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium rounded-xl border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] bg-white hover:bg-[var(--hw-neutral-50)] transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4 text-[#245501]" />
              Export PDF
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg overflow-hidden z-20">
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    window.print();
                  }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" /> Preview
                </button>
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    window.print();
                  }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
                {[
                  { key: "id",         label: "Log ID"    },
                  { key: "timestamp",  label: "Timestamp" },
                  { key: "actor",      label: "Actor"     },
                  { key: "action",     label: "Action"    },
                  { key: "details",    label: "Details"   },
                  { key: "ip",         label: "IP Address"},
                ].map((h) => (
                  <th
                    key={h.key}
                    className="text-left px-5 py-3 font-semibold text-[var(--hw-neutral-700)] text-[11px] uppercase tracking-wide whitespace-nowrap"
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hw-neutral-100)]">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <EmptyState filtered={hasFilters} />
                  </td>
                </tr>
              ) : (
                data.items.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--hw-neutral-50)] transition-colors">
                    <td className="px-5 py-3 font-mono text-[11px] text-[var(--hw-neutral-500)] whitespace-nowrap">
                      {row.id}
                    </td>
                    <td className="px-5 py-3 text-[var(--hw-neutral-700)] whitespace-nowrap text-[12px]">
                      {fmtDatetime(row.created_at)}
                    </td>
                    <td className="px-5 py-3 font-medium text-[var(--hw-neutral-800)] whitespace-nowrap">
                      {/* actor_name resolved by backend join with users table */}
                      {row.actor_name || row.user_id || "—"}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <ActionBadge action={row.action} />
                    </td>
                    <td className="px-5 py-3 text-[var(--hw-neutral-700)] max-w-[300px] truncate">
                      {row.details || <span className="text-[var(--hw-neutral-400)] italic">No details</span>}
                    </td>
                    <td className="px-5 py-3 text-[var(--hw-neutral-600)] whitespace-nowrap font-mono text-[12px]">
                      {row.ip_address || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden">
          {data.items.length === 0 ? (
            <div className="px-5 py-16 flex justify-center">
              <EmptyState filtered={hasFilters} />
            </div>
          ) : (
            <div className="divide-y divide-[var(--hw-neutral-100)]">
              {data.items.map((row) => (
                <div key={row.id} className="px-5 py-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <ActionBadge action={row.action} />
                    <span className="text-[11px] text-[var(--hw-neutral-500)] font-mono">
                      {row.id}
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--hw-neutral-500)]">
                    {fmtDatetime(row.created_at)}
                  </p>
                  <p className="text-[13px] font-semibold text-[var(--hw-neutral-800)]">
                    {row.actor_name || row.user_id || "—"}
                  </p>
                  {row.details && (
                    <p className="text-[12px] text-[var(--hw-neutral-700)]">{row.details}</p>
                  )}
                  <p className="text-[11px] text-[var(--hw-neutral-500)] font-mono">
                    {row.ip_address || "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Pagination ── */}
      <div className="mt-4 flex items-center justify-between gap-4 px-5 py-3.5 bg-white border border-[var(--hw-neutral-200)] rounded-2xl shadow-[var(--shadow-xs)] text-[12px] text-[var(--hw-neutral-700)] flex-wrap">
        <p>
          {data.total > 0
            ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, data.total)} of ${data.total} activities`
            : "No entries"}
        </p>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2.5 py-1 border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-600)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-2.5 py-1 border rounded-lg transition-colors ${
                p === page
                  ? "border-[var(--hw-green-600)] bg-[var(--hw-green-700)] text-white"
                  : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-600)] hover:bg-[var(--hw-neutral-50)]"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2.5 py-1 border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-600)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminAuditLogs;
