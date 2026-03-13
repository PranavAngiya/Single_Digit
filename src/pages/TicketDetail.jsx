import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../lib/api";

function resolvedIn(created_at, resolved_at) {
  if (!resolved_at) return null;
  const ms = new Date(resolved_at) - new Date(created_at);
  const h = Math.round(ms / 3600000);
  if (h < 1) return "< 1 hour";
  if (h < 24) return `${h} hour${h !== 1 ? "s" : ""}`;
  const d = Math.round(h / 24);
  return `${d} day${d !== 1 ? "s" : ""}`;
}

const PRIORITY_COLORS = { critical: "#dc2626", high: "#f97316", medium: "#eab308", low: "#22c55e" };
const STATUS_COLORS = { open: "#5a6acf", in_progress: "#f97316", resolved: "#22c55e", closed: "#94a3b8" };

function Badge({ label, color }) {
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: color + "22", color }}>
      {label}
    </span>
  );
}

const EVENT_COLORS = {
  created:         "#5a6acf",
  status_change:   "#0ea5e9",
  priority_change: "#f97316",
  team_change:     "#8b5cf6",
  fix_attempted:   "#eab308",
  fix_succeeded:   "#22c55e",
  escalated:       "#dc2626",
  resolved:        "#22c55e",
  closed:          "#94a3b8",
};

function HistoryTimeline({ history }) {
  if (!history?.length) return <p className="text-sm text-secondary">No history recorded.</p>;
  return (
    <ol className="relative border-l border-border ml-2 space-y-4">
      {history.map((evt, i) => {
        const color = EVENT_COLORS[evt.event_type] || "#94a3b8";
        const label = evt.event_type.replace(/_/g, " ");
        return (
          <li key={evt.id || i} className="ml-4">
            <span
              className="absolute -left-[7px] w-3 h-3 rounded-full border-2 border-white"
              style={{ background: color }}
            />
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-semibold capitalize" style={{ color }}>{label}</span>
                {evt.note && <p className="text-xs text-secondary mt-0.5">{evt.note}</p>}
                {(evt.old_value || evt.new_value) && (
                  <p className="text-xs text-secondary mt-0.5">
                    {evt.old_value && <span className="line-through mr-1">{evt.old_value}</span>}
                    {evt.new_value && <span className="font-medium text-primary">{evt.new_value}</span>}
                  </p>
                )}
              </div>
              <span className="text-xs text-secondary shrink-0">{new Date(evt.created_at).toLocaleString()}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ResolutionPath({ path }) {
  if (!path?.length) return <p className="text-sm text-secondary">No resolution path recorded.</p>;
  return (
    <ol className="space-y-2">
      {path.map((step, i) => {
        const status = step.status || (step.worked ? "succeeded" : "failed");
        const label = step.label || step.step || "—";
        const timestamp = step.attempted_at || step.tried_at;
        const color = status === "succeeded" ? "#22c55e" : status === "failed" ? "#ef4444" : "#eab308";
        const icon = status === "succeeded" ? "✓" : status === "failed" ? "✗" : "↻";
        return (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white" style={{ background: color }}>
              {icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-primary">{label}</p>
              {timestamp && (
                <p className="text-xs text-secondary">{new Date(timestamp).toLocaleString()}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function SimilarTicketsCard({ tickets }) {
  if (!tickets?.length) return <p className="text-sm text-secondary">No similar tickets found.</p>;
  return (
    <ul className="space-y-2">
      {tickets.map(s => (
        <li key={s.id} className="flex items-center justify-between gap-2">
          <Link to={`/tickets/${s.id}`} className="text-sm text-accent hover:underline truncate flex-1">
            <span className="font-mono text-xs text-secondary mr-1">{s.ticket_number}</span>
            {s.subject}
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            {s.similarity != null && (
              <span className="text-xs text-secondary">{Math.round(s.similarity * 100)}% match</span>
            )}
            <Badge label={s.priority} color={PRIORITY_COLORS[s.priority] || "#5a6acf"} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SkeletonDetail() {
  return (
    <div className="space-y-4 max-w-5xl animate-pulse">
      <div className="h-4 w-24 bg-border rounded" />
      <div className="flex gap-3">
        <div className="h-6 w-20 bg-border rounded" />
        <div className="h-6 flex-1 bg-border rounded" />
        <div className="h-6 w-16 bg-border rounded" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <div className="bg-white border border-border rounded-xl p-4 space-y-2">
            <div className="h-3 w-24 bg-border rounded" />
            <div className="h-4 w-full bg-border rounded" />
            <div className="h-4 w-5/6 bg-border rounded" />
            <div className="h-4 w-4/6 bg-border rounded" />
          </div>
          <div className="bg-white border border-border rounded-xl p-4 space-y-2">
            <div className="h-3 w-32 bg-border rounded" />
            {[...Array(4)].map((_, i) => <div key={i} className="h-4 w-full bg-border rounded" />)}
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white border border-border rounded-xl p-4 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-border rounded" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    setData(null);
    setError(null);
    api.get(`/api/helpdesk/tickets/${id}`)
      .then(r => {
        setData(r.data);
        const t = r.data.ticket || r.data;
        setNewStatus(t?.status || "open");
      })
      .catch(err => {
        if (err.response?.status === 404) setError("Ticket not found.");
        else setError("Failed to load ticket.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const r = await api.patch(`/api/helpdesk/tickets/${id}`, { status: newStatus });
      const updated = r.data;
      setData(prev => ({
        ...prev,
        ticket: { ...(prev.ticket || prev), status: updated.status },
        status: updated.status,
      }));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <SkeletonDetail />;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  const ticket = data.ticket || data;
  const history = data.history || [];
  const resolutionPath = data.resolution_path || [];
  const similar = data.similar_tickets || [];
  const kbMatch = data.kb_match || null;

  return (
    <div className="space-y-4 max-w-5xl">
      <Link to="/tickets" className="text-sm text-accent hover:underline">← Tickets</Link>

      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <span className="font-mono text-xs text-secondary mt-1">{ticket.ticket_number}</span>
        <h1 className="text-xl font-semibold text-primary flex-1">{ticket.subject}</h1>
        <Badge label={ticket.priority} color={PRIORITY_COLORS[ticket.priority] || "#5a6acf"} />
        <Badge label={ticket.status} color={STATUS_COLORS[ticket.status] || "#5a6acf"} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left: 2 cols */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white border border-border rounded-xl p-4">
            <p className="text-xs font-semibold uppercase text-secondary mb-2">Description</p>
            <p className="text-sm text-primary whitespace-pre-wrap">{ticket.description || "—"}</p>
          </div>

          {/* Resolution Path */}
          <div className="bg-white border border-border rounded-xl p-4">
            <p className="text-xs font-semibold uppercase text-secondary mb-3">Resolution Path</p>
            <ResolutionPath path={resolutionPath} />
          </div>

          {/* KB Match */}
          {kbMatch && (
            <div className="bg-white border border-border rounded-xl p-4">
              <p className="text-xs font-semibold uppercase text-secondary mb-2">
                KB Match
                <span className="ml-2 normal-case font-normal text-accent">— {kbMatch.topic}</span>
                <span className="ml-1 text-secondary font-normal">({Math.round((kbMatch.score || 0) * 100)}% match)</span>
              </p>
              <ol className="space-y-1 list-decimal list-inside">
                {(kbMatch.resolution_steps || []).map((step, i) => (
                  <li key={i} className="text-sm text-primary">{step}</li>
                ))}
              </ol>
            </div>
          )}

          {/* History Timeline */}
          <div className="bg-white border border-border rounded-xl p-4">
            <p className="text-xs font-semibold uppercase text-secondary mb-3">History</p>
            <HistoryTimeline history={history} />
          </div>

          {/* Similar Tickets */}
          {similar.length > 0 && (
            <div className="bg-white border border-border rounded-xl p-4">
              <p className="text-xs font-semibold uppercase text-secondary mb-3">Similar Tickets</p>
              <SimilarTicketsCard tickets={similar} />
            </div>
          )}
        </div>

        {/* Right: 1 col */}
        <div className="space-y-4">
          <div className="bg-white border border-border rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold uppercase text-secondary">Details</p>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-secondary">Team</span>
                <span className="text-primary">{ticket.team_name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Priority</span>
                <Badge label={ticket.priority} color={PRIORITY_COLORS[ticket.priority] || "#5a6acf"} />
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Status</span>
                <Badge label={ticket.status} color={STATUS_COLORS[ticket.status] || "#5a6acf"} />
              </div>
              {ticket.category && (
                <div className="flex justify-between">
                  <span className="text-secondary">Category</span>
                  <span className="text-primary text-xs text-right max-w-[140px]">{ticket.category}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-secondary">Created</span>
                <span className="text-primary text-xs">{new Date(ticket.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Resolved</span>
                <span className="text-primary text-xs">{ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleDateString() : "—"}</span>
              </div>
              {ticket.resolved_at && (
                <div className="flex justify-between">
                  <span className="text-secondary">Resolved in</span>
                  <span className="text-green-600 text-xs font-medium">{resolvedIn(ticket.created_at, ticket.resolved_at)}</span>
                </div>
              )}
              {ticket.incident_id && (
                <div className="flex justify-between">
                  <span className="text-secondary">Incident</span>
                  <a href="/incidents" className="text-xs text-accent hover:underline">View incident →</a>
                </div>
              )}
            </div>
          </div>

          {/* Update status */}
          <div className="bg-white border border-border rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold uppercase text-secondary">Update Status</p>
            <select
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-accent text-white rounded-lg py-1.5 text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
