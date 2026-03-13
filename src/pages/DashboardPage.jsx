import { useEffect, useState } from "react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine,
} from "recharts";
import { Tag, Clock, AlertTriangle, Users, Ticket, CheckCircle, AlertCircle, Zap } from "lucide-react";

const PRIORITY_COLORS = { critical: "#dc2626", high: "#f97316", medium: "#eab308", low: "#22c55e" };
const STATUS_COLORS = { open: "#5a6acf", in_progress: "#f97316", resolved: "#22c55e", closed: "#94a3b8" };

function Badge({ label, color }) {
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium capitalize" style={{ background: color + "22", color }}>
      {label?.replace("_", " ")}
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color = "#5a6acf" }) {
  return (
    <div className="bg-white border border-border rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "18" }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-secondary font-medium truncate">{label}</p>
        <p className="text-xl font-bold text-primary leading-tight">{value ?? "—"}</p>
        {sub && <p className="text-xs text-secondary mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg px-3 py-2 shadow-sm text-xs">
      <p className="font-semibold text-primary mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [byPriority, setByPriority] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [volumeTrend, setVolumeTrend] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [resolutionTime, setResolutionTime] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const r = await api.get("/api/helpdesk/dashboard/all");
        const d = r.data;
        setSummary(d.summary);
        setByPriority(d.by_priority || []);
        setByCategory((d.by_category || []).slice(0, 5));
        setVolumeTrend(d.volume_trend || []);
        setRecentTickets(d.recent_tickets || []);
        setIncidents(d.incidents || []);
        setResolutionTime((d.resolution_time || []).slice(0, 5));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-border rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-border rounded-xl" />)}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-border rounded-xl" />)}
        </div>
        <div className="h-64 bg-border rounded-xl" />
      </div>
    );
  }

  const priorityPieData = byPriority.filter(p => p.count > 0);
  const priorityTotal = priorityPieData.reduce((s, p) => s + p.count, 0);

  function isoToWeekLabel(isoStr) {
    const d = new Date(isoStr);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    return `W${String(weekNum).padStart(2, '0')}`;
  }
  const incidentWeekMap = {};
  incidents.forEach(inc => {
    const wLabel = isoToWeekLabel(inc.started_at);
    if (!incidentWeekMap[wLabel]) incidentWeekMap[wLabel] = [];
    incidentWeekMap[wLabel].push(inc.title);
  });
  const avgResDisplay = summary?.avg_resolution_hours != null
    ? summary.avg_resolution_hours < 24
      ? `${summary.avg_resolution_hours}h`
      : `${(summary.avg_resolution_hours / 24).toFixed(1)}d`
    : "—";

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-primary">Dashboard</h1>

      {/* Row 1 — Core KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Tickets" value={summary?.total_tickets?.toLocaleString()} icon={Ticket} color="#5a6acf" />
        <KpiCard label="Open" value={summary?.open} icon={AlertCircle} color="#5a6acf" />
        <KpiCard label="Resolved" value={summary?.resolved} icon={CheckCircle} color="#22c55e" />
        <KpiCard label="Critical" value={summary?.critical} icon={AlertTriangle} color="#dc2626" />
      </div>

      {/* Row 2 — Extended KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Top Category"
          value={summary?.most_common_topic || "—"}
          icon={Tag}
          color="#8b5cf6"
        />
        <KpiCard
          label="Avg Resolution Time"
          value={avgResDisplay}
          sub="for resolved tickets"
          icon={Clock}
          color="#f97316"
        />
        <KpiCard
          label="Active Incidents"
          value={summary?.incident_count ?? "—"}
          sub="outage events tracked"
          icon={Zap}
          color="#dc2626"
        />
        <KpiCard
          label="In Progress"
          value={summary?.in_progress ?? "—"}
          sub="being worked on"
          icon={Users}
          color="#0ea5e9"
        />
      </div>

      {/* Row 3 — Charts */}
      <div className="grid grid-cols-3 gap-4">
        {/* Volume trend area chart — 2 cols */}
        <div className="col-span-2 bg-white border border-border rounded-xl p-4">
          <p className="text-sm font-semibold text-primary mb-3">Tickets by Week (12 weeks)</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={volumeTrend} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5a6acf" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#5a6acf" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const incident = incidentWeekMap[label];
                return (
                  <div className="bg-white border border-border rounded-lg px-3 py-2 shadow-sm text-xs max-w-xs">
                    <p className="font-semibold text-primary mb-1">{label}</p>
                    {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>)}
                    {incident && (
                      <div className="mt-1.5 pt-1.5 border-t border-red-200">
                        <p className="text-red-600 font-semibold">⚠ Incident{incident.length > 1 ? 's' : ''}:</p>
                        {incident.map((t, i) => <p key={i} className="text-red-500">{t}</p>)}
                      </div>
                    )}
                  </div>
                );
              }} />
              <Area type="monotone" dataKey="count" name="Tickets" stroke="#5a6acf" strokeWidth={2} fill="url(#volGrad)" dot={false} />
              {Object.keys(incidentWeekMap).map(wLabel => (
                <ReferenceLine key={wLabel} x={wLabel} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2"
                  label={{ value: '⚠', position: 'top', fill: '#ef4444', fontSize: 12 }} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Priority donut */}
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-sm font-semibold text-primary mb-3">Priority Distribution</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={priorityPieData}
                dataKey="count"
                nameKey="priority"
                innerRadius={45}
                outerRadius={72}
                paddingAngle={3}
              >
                {priorityPieData.map(entry => (
                  <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || "#5a6acf"} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [
                `${Math.round((v / (priorityTotal || 1)) * 100)}% (${v})`,
                n
              ]} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={v => <span className="text-xs capitalize text-primary">{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 4 — By-category bar + Resolution Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-sm font-semibold text-primary mb-3">Top 5 Categories by Volume</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byCategory} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={180} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f2f7" }} />
              <Bar dataKey="count" name="Tickets" fill="#5a6acf" radius={[0, 6, 6, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-sm font-semibold text-primary mb-3">Avg Resolution Time — Top 5 Categories</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={resolutionTime} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} unit="h" />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={180} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f2f7" }} />
              <Bar dataKey="avg_hours" name="Avg Hours" fill="#f97316" radius={[0, 6, 6, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 5 — Incidents widget */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-primary">Active Incidents</p>
          <button onClick={() => navigate("/helpdesk/incidents")} className="text-xs text-accent hover:underline">View all →</button>
        </div>
        {incidents.length === 0 ? (
          <p className="px-4 py-4 text-sm text-secondary">No incidents recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-sidebar">
              <tr>
                {["Title", "Category", "Started", "Tickets", "Status"].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-secondary uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.map(inc => (
                <tr key={inc.id} onClick={() => navigate("/helpdesk/incidents")} className="border-t border-border hover:bg-sidebar cursor-pointer transition-colors">
                  <td className="px-4 py-2 text-primary font-medium max-w-xs truncate">{inc.title}</td>
                  <td className="px-4 py-2 text-secondary text-xs">{inc.category}</td>
                  <td className="px-4 py-2 text-secondary text-xs">{new Date(inc.started_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-secondary text-xs">{inc.ticket_count}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      inc.resolved_at ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                    }`}>{inc.resolved_at ? "Resolved" : "Active"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent tickets */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-primary">Recent Tickets</p>
          <button onClick={() => navigate("/helpdesk/tickets")} className="text-xs text-accent hover:underline">View all →</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-sidebar">
            <tr>
              {["#", "Subject", "Priority", "Status", "Created"].map(h => (
                <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-secondary uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentTickets.map(t => (
              <tr
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                className="border-t border-border hover:bg-sidebar cursor-pointer transition-colors"
              >
                <td className="px-4 py-2 font-mono text-xs text-secondary">{t.ticket_number}</td>
                <td className="px-4 py-2 text-primary max-w-xs truncate">{t.subject}</td>
                <td className="px-4 py-2"><Badge label={t.priority} color={PRIORITY_COLORS[t.priority] || "#5a6acf"} /></td>
                <td className="px-4 py-2"><Badge label={t.status} color={STATUS_COLORS[t.status] || "#5a6acf"} /></td>
                <td className="px-4 py-2 text-secondary text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
