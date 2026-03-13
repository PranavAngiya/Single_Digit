import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus } from "lucide-react";
import api from "../lib/api";
import FilterBar from "../components/FilterBar";

const CATEGORIES = [
  "Login failure / locked out",
  "Password reset not working",
  "Multi-factor authentication (MFA) issues",
  "Benefits enrollment not loading",
  "Insurance claim status not updating",
  "Coverage details incorrect or missing",
  "Payment declined / processing error",
  "Duplicate charge / incorrect billing",
  "Refund not received",
  "Website not loading / page errors",
  "Mobile app crashing or freezing",
  "Dashboard data not refreshing",
  "Report generation failing",
  "Data export not working",
  "Integration sync failure",
  "Email notifications not sending",
  "Document upload failing",
  "Search returning wrong results",
  "Performance slow / timeout errors",
  "Account settings not saving",
];

function CreateTicketModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ subject: "", description: "", category: "", priority: "medium" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function update(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      setError("Subject and description are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/helpdesk/tickets", {
        subject: form.subject.trim(),
        description: form.description.trim(),
        priority: form.priority,
        source: "manual",
        ...(form.category ? { category: form.category } : {}),
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create ticket.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-primary">Create Ticket</h2>
          <button onClick={onClose} className="text-secondary hover:text-primary p-1 rounded"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-xs font-semibold text-secondary uppercase mb-1">Subject *</label>
            <input
              type="text" value={form.subject} onChange={e => update("subject", e.target.value)}
              placeholder="Short summary of the issue"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary uppercase mb-1">Description *</label>
            <textarea
              value={form.description} onChange={e => update("description", e.target.value)}
              rows={4} placeholder="Detailed description of the problem"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase mb-1">Category</label>
              <select value={form.category} onChange={e => update("category", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent bg-white">
                <option value="">Auto-detect</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase mb-1">Priority</label>
              <select value={form.priority} onChange={e => update("priority", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent bg-white">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-secondary">Category can be left as Auto-detect — the AI classifier will assign one based on your description.</p>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-secondary border border-border rounded-lg hover:bg-sidebar">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Creating…" : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const PRIORITY_COLORS = { critical: "#dc2626", high: "#f97316", medium: "#eab308", low: "#22c55e" };
const STATUS_COLORS = { open: "#5a6acf", in_progress: "#f97316", resolved: "#22c55e", closed: "#94a3b8" };

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "< 1h ago";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function Badge({ label, color }) {
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: color + "22", color }}>
      {label}
    </span>
  );
}

export default function TicketsPage() {
  const [filters, setFilters] = useState({ page: 1, page_size: 20 });
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchTickets, 300);
    return () => clearTimeout(debounceRef.current);
  }, [filters]);

  async function fetchTickets() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const r = await api.get(`/api/helpdesk/tickets?${params}`);
      setTickets(r.data.tickets || []);
      setTotal(r.data.total || 0);
    } finally {
      setLoading(false);
    }
  }

  const page = filters.page || 1;
  const pageSize = filters.page_size || 20;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {showCreate && (
        <CreateTicketModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchTickets(); }}
        />
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary">Tickets</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={15} /> New Ticket
        </button>
      </div>
      <FilterBar filters={filters} onChange={setFilters} />

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-sidebar">
            <tr>
              {["#", "Subject", "Category", "Team", "Priority", "Status", "Created", "Resolved"].map(h => (
                <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-secondary uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-secondary">Loading…</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-secondary">No tickets found.</td></tr>
            ) : tickets.map(t => (
              <tr
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                className="border-t border-border hover:bg-sidebar cursor-pointer"
              >
                <td className="px-4 py-2 font-mono text-xs text-secondary">{t.ticket_number}</td>
                <td className="px-4 py-2 text-primary max-w-xs truncate">{t.subject}</td>
                <td className="px-4 py-2 text-xs text-secondary max-w-[140px] truncate" title={t.category}>{t.category || "—"}</td>
                <td className="px-4 py-2 text-secondary text-xs">{t.team_name || "—"}</td>
                <td className="px-4 py-2">
                  <Badge label={t.priority} color={PRIORITY_COLORS[t.priority] || "#5a6acf"} />
                </td>
                <td className="px-4 py-2">
                  <Badge label={t.status} color={STATUS_COLORS[t.status] || "#5a6acf"} />
                </td>
                <td className="px-4 py-2 text-xs text-secondary">{new Date(t.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-xs text-secondary">{t.resolved_at ? relativeTime(t.resolved_at) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-sm text-secondary">
          <span>Showing {total === 0 ? 0 : start}–{end} of {total}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              className="px-3 py-1 rounded border border-border disabled:opacity-40 hover:bg-sidebar"
            >Prev</button>
            <button
              disabled={page >= totalPages}
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              className="px-3 py-1 rounded border border-border disabled:opacity-40 hover:bg-sidebar"
            >Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
