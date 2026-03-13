import { useEffect, useState } from "react";
import api from "../lib/api";

export default function FilterBar({ filters, onChange }) {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    api.get("/api/teams").then(r => setTeams(r.data || [])).catch(() => {});
  }, []);

  function update(key, value) {
    onChange({ ...filters, [key]: value, page: 1 });
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <input
        type="text"
        placeholder="Search tickets…"
        value={filters.search || ""}
        onChange={e => update("search", e.target.value)}
        className="border border-border rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent w-56"
      />
      <select
        value={filters.status || ""}
        onChange={e => update("status", e.target.value)}
        className="border border-border rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">All Statuses</option>
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
      </select>
      <select
        value={filters.priority || ""}
        onChange={e => update("priority", e.target.value)}
        className="border border-border rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">All Priorities</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <select
        value={filters.team_id || ""}
        onChange={e => update("team_id", e.target.value)}
        className="border border-border rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">All Teams</option>
        {teams.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <select
        value={filters.category || ""}
        onChange={e => update("category", e.target.value)}
        className="border border-border rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">All Categories</option>
        {[
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
        ].map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
}
