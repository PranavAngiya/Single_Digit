import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { supabase } from "../lib/supabase";
import CallSessionOverlay from "./CallSessionOverlay";
import NoElevenLabsBanner from "../components/NoElevenLabsBanner";

const ELEVENLABS_CONFIGURED = !!(import.meta.env.VITE_ELEVENLABS_AGENT_ID?.trim());

function OutcomePill({ outcome }) {
  if (!outcome)
    return <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 animate-pulse font-medium">In Progress</span>;
  if (outcome === "resolved")
    return <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Resolved</span>;
  if (outcome === "escalated")
    return <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">Escalated</span>;
  return <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Abandoned</span>;
}

export default function CallMonitor() {
  const [tab, setTab] = useState("active");
  const [calls, setCalls] = useState([]);
  const [ticketNumbers, setTicketNumbers] = useState({}); // { ticketId → ticketNumber }
  const [overlaySessionId, setOverlaySessionId] = useState(null);
  const listChannelRef = useRef(null);

  useEffect(() => {
    fetchCalls();
  }, [tab]);

  // Fetch ticket numbers for any session that has a ticket_id we haven't resolved yet.
  // All missing IDs are fetched in parallel (Promise.all) rather than sequential forEach.
  useEffect(() => {
    const missing = calls.filter(c => c.ticket_id && !ticketNumbers[c.ticket_id]);
    if (missing.length === 0) return;
    Promise.all(
      missing.map(c =>
        api.get(`/api/helpdesk/tickets/${c.ticket_id}`)
          .then(r => ({ id: c.ticket_id, num: r.data.ticket?.ticket_number || r.data.ticket_number }))
          .catch(() => null)
      )
    ).then(results => {
      const updates = {};
      results.forEach(r => { if (r?.num) updates[r.id] = r.num; });
      if (Object.keys(updates).length > 0) setTicketNumbers(prev => ({ ...prev, ...updates }));
    });
  }, [calls]);

  // Realtime subscription on call_sessions so list updates without polling
  useEffect(() => {
    if (listChannelRef.current) supabase.removeChannel(listChannelRef.current);
    const ch = supabase
      .channel("call-monitor-list")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "call_sessions",
      }, () => {
        fetchCalls();
      })
      .subscribe();
    listChannelRef.current = ch;
    return () => {
      if (listChannelRef.current) supabase.removeChannel(listChannelRef.current);
    };
  }, [tab]);

  async function fetchCalls() {
    try {
      const params = tab === "active" ? "?status=active" : "";
      const r = await api.get(`/api/helpdesk/calls${params}`);
      setCalls(r.data.sessions || []);
    } catch {}
  }

  const hasActive = calls.some(c => c.status === "active");

  return (
    <>
      {overlaySessionId && (
        <CallSessionOverlay
          sessionId={overlaySessionId}
          onClose={() => setOverlaySessionId(null)}
        />
      )}

      <div className="space-y-4 h-full">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-primary">Call Monitor</h1>
          {hasActive && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 live-dot" />
              Live
            </span>
          )}
          {tab === "active" && !ELEVENLABS_CONFIGURED && (
            <NoElevenLabsBanner variant="inline" />
          )}
        </div>

        <div className="bg-white border border-border rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {["active", "all"].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-2.5 text-sm font-medium capitalize transition-colors ${
                  tab === t ? "text-accent border-b-2 border-accent" : "text-secondary hover:text-primary"
                }`}
              >
                {t === "active" ? "Active" : "All Calls"}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-sidebar">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-secondary uppercase tracking-wide">Session ID</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-secondary uppercase tracking-wide">Started</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-secondary uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-secondary uppercase tracking-wide">Category</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-secondary uppercase tracking-wide">Outcome</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-secondary uppercase tracking-wide">Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {calls.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-secondary">
                      No calls found.
                    </td>
                  </tr>
                ) : calls.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setOverlaySessionId(c.id)}
                    className="hover:bg-sidebar transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-secondary">{c.id.slice(0, 12)}…</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-secondary">
                      {c.started_at ? new Date(c.started_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {c.status === "active" ? (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot" />
                            Active
                          </span>
                        ) : c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-primary">
                      {c.category || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <OutcomePill outcome={c.outcome} />
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {c.ticket_id ? (
                        <Link
                          to={`/tickets/${c.ticket_id}`}
                          className="text-xs text-accent hover:underline font-medium"
                        >
                          {ticketNumbers[c.ticket_id] || "View ticket"} →
                        </Link>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-secondary text-center">
          Click any row to open the live call monitor overlay.
        </p>
      </div>
    </>
  );
}
