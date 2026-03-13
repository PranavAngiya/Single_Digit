import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Zap, Clock, Ticket } from "lucide-react";

const STATUS_COLORS = { open: "#5a6acf", in_progress: "#f97316", resolved: "#22c55e", closed: "#94a3b8" };
const PRIORITY_COLORS = { critical: "#dc2626", high: "#f97316", medium: "#eab308", low: "#22c55e" };

function Badge({ label, color }) {
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: color + "22", color }}>
      {label}
    </span>
  );
}

function IncidentCard({ incident, onClick }) {
  const started = new Date(incident.started_at);
  const resolved = incident.resolved_at ? new Date(incident.resolved_at) : null;
  const durationMs = resolved ? resolved - started : Date.now() - started;
  const durationH = (durationMs / 3600000).toFixed(1);
  const isActive = !incident.resolved_at;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-border rounded-xl p-5 cursor-pointer hover:border-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Zap size={16} className={isActive ? "text-red-500" : "text-secondary"} />
          <h3 className="text-sm font-semibold text-primary">{incident.title}</h3>
        </div>
        <Badge
          label={isActive ? "Active" : "Resolved"}
          color={isActive ? "#dc2626" : "#22c55e"}
        />
      </div>

      <p className="text-xs text-secondary mb-3 line-clamp-2">{incident.description}</p>

      <div className="flex items-center gap-4 text-xs text-secondary">
        <span className="flex items-center gap-1">
          <Ticket size={12} />
          {incident.ticket_count} tickets
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {durationH}h duration
        </span>
        <span>{started.toLocaleDateString()}</span>
      </div>

      <div className="mt-2">
        <span className="text-xs text-accent">{incident.category}</span>
      </div>
    </div>
  );
}

function IncidentDetail({ incident, tickets, onClose }) {
  const started = new Date(incident.started_at);
  const resolved = incident.resolved_at ? new Date(incident.resolved_at) : null;
  const durationMs = resolved ? resolved - started : Date.now() - started;
  const durationH = (durationMs / 3600000).toFixed(1);
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary">{incident.title}</h2>
          <p className="text-xs text-accent mt-0.5">{incident.category}</p>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-secondary hover:text-primary px-2 py-1 rounded border border-border"
        >
          ← Back
        </button>
      </div>

      <p className="text-sm text-secondary">{incident.description}</p>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="bg-sidebar rounded-lg p-3">
          <p className="text-xs text-secondary mb-1">Started</p>
          <p className="font-medium text-primary">{started.toLocaleString()}</p>
        </div>
        <div className="bg-sidebar rounded-lg p-3">
          <p className="text-xs text-secondary mb-1">Resolved</p>
          <p className="font-medium text-primary">{resolved ? resolved.toLocaleString() : "Ongoing"}</p>
        </div>
        <div className="bg-sidebar rounded-lg p-3">
          <p className="text-xs text-secondary mb-1">Duration</p>
          <p className="font-medium text-primary">{durationH}h</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-secondary mb-3">
          Affected Tickets ({tickets.length})
        </p>
        {tickets.length === 0 ? (
          <p className="text-sm text-secondary">No tickets linked to this incident.</p>
        ) : (
          <div className="overflow-hidden border border-border rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-sidebar">
                <tr>
                  {["#", "Subject", "Priority", "Status", "Created", "Resolved"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-secondary uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    className="border-t border-border hover:bg-sidebar cursor-pointer"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-secondary">{t.ticket_number}</td>
                    <td className="px-3 py-2 text-primary max-w-xs truncate">{t.subject}</td>
                    <td className="px-3 py-2">
                      <Badge label={t.priority} color={PRIORITY_COLORS[t.priority] || "#5a6acf"} />
                    </td>
                    <td className="px-3 py-2">
                      <Badge label={t.status} color={STATUS_COLORS[t.status] || "#5a6acf"} />
                    </td>
                    <td className="px-3 py-2 text-xs text-secondary">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs text-secondary">
                      {t.resolved_at ? new Date(t.resolved_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    api.get("/api/helpdesk/incidents")
      .then(r => setIncidents(r.data.incidents || []))
      .finally(() => setLoading(false));
  }, []);

  async function handleSelect(incident) {
    setSelected(incident);
    setDetailLoading(true);
    try {
      const r = await api.get(`/api/helpdesk/incidents/${incident.id}`);
      setDetail(r.data);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-primary">Incidents</h1>
      <p className="text-sm text-secondary">Outage events and clustered ticket bursts tracked by the system.</p>

      {loading ? (
        <div className="grid grid-cols-3 gap-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 bg-border rounded-xl" />
          ))}
        </div>
      ) : selected ? (
        detailLoading ? (
          <div className="h-64 bg-border rounded-xl animate-pulse" />
        ) : (
          detail && (
            <IncidentDetail
              incident={detail.incident}
              tickets={detail.tickets || []}
              onClose={() => { setSelected(null); setDetail(null); }}
            />
          )
        )
      ) : incidents.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-8 text-center text-secondary text-sm">
          No incidents recorded.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {incidents.map(inc => (
            <IncidentCard key={inc.id} incident={inc} onClick={() => handleSelect(inc)} />
          ))}
        </div>
      )}
    </div>
  );
}
