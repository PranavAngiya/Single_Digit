import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { X, Mic, PhoneOff, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import api from "../lib/api";
import { supabase } from "../lib/supabase";

const PHASE_LABELS = [
  "Understanding Intent",
  "KB Match Found",
  "Classification Complete",
  "Walking Resolution Steps",
  "Resolved ✓",
  "Escalated",
];

function currentPhase(session, stepsCount) {
  if (!session) return 0;
  if (session.outcome === "resolved") return 4;
  if (session.outcome === "escalated") return 5;
  if (stepsCount > 0) return 3;
  if (session.priority) return 2;
  if (session.category) return 1;
  return 0;
}

function StatusBadge({ status }) {
  if (status === "active")
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
        <span className="w-2 h-2 rounded-full bg-green-500 live-dot" /> Active
      </span>
    );
  if (status === "ended")
    return <span className="text-xs font-medium text-gray-400">Ended</span>;
  return <span className="text-xs font-medium text-orange-500">Abandoned</span>;
}

function OutcomePill({ outcome }) {
  if (!outcome)
    return (
      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600 animate-pulse">
        In Progress
      </span>
    );
  if (outcome === "resolved")
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Resolved</span>;
  if (outcome === "escalated")
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">Escalated</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Abandoned</span>;
}

function FieldCard({ label, value, sourceLabel, status }) {
  const isPending = !value || status === "pending";
  return (
    <div className={`rounded-lg border px-3 py-2 ${isPending ? "border-border" : "border-l-4 border-l-green-400 border-t-border border-r-border border-b-border"}`}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs font-semibold text-secondary uppercase tracking-wide">{label}</span>
        {sourceLabel && (
          <span className="text-[10px] text-secondary bg-sidebar px-1.5 py-0.5 rounded">{sourceLabel}</span>
        )}
      </div>
      <p className={`text-sm font-medium ${isPending ? "text-gray-400 italic" : "text-primary"}`}>
        {isPending ? "Pending…" : value}
      </p>
    </div>
  );
}

function StepRow({ step, log }) {
  const icon = !log ? null :
    log.status === "trying" ? <Loader2 size={14} className="text-blue-500 animate-spin" /> :
    log.status === "succeeded" ? <CheckCircle size={14} className="text-green-500" /> :
    <XCircle size={14} className="text-red-500" />;

  const bg = !log ? "bg-white" :
    log.status === "trying" ? "bg-blue-50" :
    log.status === "succeeded" ? "bg-green-50" :
    "bg-red-50";

  return (
    <div className={`flex items-start gap-2 rounded-lg px-3 py-2 border border-border ${bg}`}>
      <div className="mt-0.5 flex-shrink-0">
        {icon || <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 inline-block" />}
      </div>
      <p className={`text-xs leading-relaxed ${!log ? "text-gray-400" : "text-primary"}`}>
        {step.label}
      </p>
    </div>
  );
}

function OutcomePanel({ session, steps }) {
  if (!session?.outcome) return null;
  const ticketNum = session.ticket_number;

  if (session.outcome === "resolved") {
    const succeededStep = steps.find(s => s.log?.status === "succeeded");
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-3 mt-3">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle size={16} className="text-green-600" />
          <span className="text-sm font-semibold text-green-800">Resolved during call</span>
        </div>
        {ticketNum && (
          <p className="text-xs text-green-700">
            Ticket {ticketNum} created
            {succeededStep && ` — fixed on step: ${succeededStep.label}`}
          </p>
        )}
      </div>
    );
  }
  if (session.outcome === "escalated") {
    return (
      <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 mt-3">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={16} className="text-orange-600" />
          <span className="text-sm font-semibold text-orange-800">Ticket opened — escalated</span>
        </div>
        {ticketNum && (
          <p className="text-xs text-orange-700">
            Ticket {ticketNum} raised
            {session.team_name && ` — ${session.team_name} will follow up`}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 mt-3">
      <p className="text-sm font-semibold text-gray-600">Call ended by admin — no ticket created</p>
    </div>
  );
}

export default function CallSessionOverlay({ sessionId, onClose }) {
  const [session, setSession] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [stepLogs, setStepLogs] = useState([]);
  const [treeNodes, setTreeNodes] = useState([]);
  const [ending, setEnding] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const channelsRef = useRef([]);

  // Scroll transcript to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Initial data load
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [sessRes, txRes, stepsRes] = await Promise.all([
          api.get(`/api/helpdesk/calls/${sessionId}`),
          api.get(`/api/helpdesk/calls/${sessionId}/transcript`),
          api.get(`/api/helpdesk/calls/${sessionId}/steps`),
        ]);
        if (cancelled) return;
        const sess = sessRes.data;
        setSession(sess);
        setTranscript(txRes.data.transcript || []);
        setStepLogs(stepsRes.data.steps || []);

        // Fetch tree nodes if kb_tree_id is set
        if (sess.kb_tree_id) {
          try {
            const treeRes = await api.get(`/api/helpdesk/kb/trees/${sess.kb_tree_id}`);
            if (!cancelled) {
              const nodes = (treeRes.data.nodes || []).filter(n => !n.is_escalation);
              // Sort depth-first
              setTreeNodes(nodes);
            }
          } catch {}
        }

        // Fetch ticket number if ticket_id is set
        if (sess.ticket_id) {
          try {
            const tktRes = await api.get(`/api/helpdesk/tickets/${sess.ticket_id}`);
            if (!cancelled) {
              const tktNum = tktRes.data.ticket?.ticket_number || tktRes.data.ticket_number;
              setSession(prev => prev ? { ...prev, ticket_number: tktNum } : prev);
            }
          } catch {}
        }
      } catch {}
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [sessionId]);

  // Realtime subscriptions (3 channels)
  useEffect(() => {
    // Channel 1: session metadata updates
    const ch1 = supabase
      .channel(`overlay-session-${sessionId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "call_sessions",
        filter: `id=eq.${sessionId}`,
      }, async (payload) => {
        const updated = payload.new;
        setSession(prev => prev ? { ...prev, ...updated } : updated);
        // If ticket_id just appeared, fetch ticket number
        if (updated.ticket_id) {
          try {
            const tktRes = await api.get(`/api/helpdesk/tickets/${updated.ticket_id}`);
            const tktNum = tktRes.data.ticket?.ticket_number || tktRes.data.ticket_number;
            setSession(prev => prev ? { ...prev, ticket_number: tktNum } : prev);
          } catch {}
        }
        // If kb_tree_id just appeared, fetch tree nodes
        if (updated.kb_tree_id) {
          try {
            const treeRes = await api.get(`/api/helpdesk/kb/trees/${updated.kb_tree_id}`);
            const nodes = (treeRes.data.nodes || []).filter(n => !n.is_escalation);
            setTreeNodes(nodes);
          } catch {}
        }
      })
      .subscribe();

    // Channel 2: transcript inserts
    const ch2 = supabase
      .channel(`overlay-transcript-${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "call_transcripts",
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setTranscript(prev => [...prev, payload.new]);
      })
      .subscribe();

    // Channel 3: step log inserts
    const ch3 = supabase
      .channel(`overlay-steps-${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "call_step_log",
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setStepLogs(prev => [...prev, payload.new]);
      })
      .subscribe();

    channelsRef.current = [ch1, ch2, ch3];
    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [sessionId]);

  async function handleEndCall() {
    setEnding(true);
    try {
      await api.post("/api/helpdesk/agent/end-call", { session_id: sessionId });
    } catch {
      setEnding(false);
    }
  }

  // Build merged step list: tree nodes as skeleton, step logs as status overlay
  const logsByNodeId = {};
  const logsByLabel = {};
  stepLogs.forEach(log => {
    if (log.node_id) logsByNodeId[log.node_id] = log;
    else logsByLabel[log.step_label] = log;
  });

  let mergedSteps = [];
  if (treeNodes.length > 0) {
    mergedSteps = treeNodes.map(node => ({
      node_id: node.id,
      label: node.action_label,
      log: logsByNodeId[node.id] || null,
    }));
  } else if (stepLogs.length > 0) {
    mergedSteps = stepLogs.map(log => ({
      node_id: log.node_id,
      label: log.step_label,
      log,
    }));
  }

  const phaseIdx = currentPhase(session, stepLogs.length);

  const DATA_SOURCES = [
    { label: "ElevenLabs", desc: "STT, TTS, conversational NLP" },
    { label: "RAG / FAISS", desc: "KB category match + tree lookup" },
    { label: "GPT-4o-mini", desc: "Priority + team assignment" },
    { label: "Burst detection", desc: "FAISS similarity → auto-escalate" },
    { label: "Hardcoded", desc: "Ticket status default = 'open'" },
    { label: "Supabase", desc: "Ticket storage + sequential TKT-#" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-stretch justify-stretch">
      <div className="flex-1 bg-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-primary">Live Call Monitor</h2>
            <span className="font-mono text-xs text-secondary">{sessionId.slice(0, 8)}…</span>
            {session && <StatusBadge status={session.status} />}
            {session && <OutcomePill outcome={session.outcome} />}
            {session?.ticket_id && (
              <Link
                to={`/tickets/${session.ticket_id}`}
                onClick={onClose}
                className="text-xs text-accent hover:underline ml-2"
              >
                {session.ticket_number || "View Ticket"} →
              </Link>
            )}
          </div>
          <button onClick={onClose} className="text-secondary hover:text-primary p-1">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={28} className="text-accent animate-spin" />
          </div>
        ) : (
          /* 3-column body */
          <div className="flex-1 grid grid-cols-[42%_30%_28%] overflow-hidden">

            {/* ── Column 1: Transcript ── */}
            <div className="flex flex-col border-r border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex-shrink-0">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wide">Live Transcript</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {transcript.length === 0 ? (
                  <p className="text-sm text-secondary">No transcript yet…</p>
                ) : (
                  transcript.map((line, i) => (
                    <div key={line.id || i} className={`flex gap-2 ${line.speaker === "agent" ? "" : "flex-row-reverse"}`}>
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        line.speaker === "agent" ? "bg-accent text-white" : "bg-gray-200 text-gray-600"
                      }`}>
                        {line.speaker === "agent" ? "AI" : "C"}
                      </div>
                      <p className={`text-sm px-3 py-2 rounded-xl max-w-[75%] ${
                        line.speaker === "agent"
                          ? "bg-white border border-border text-primary"
                          : "bg-accent text-white"
                      }`}>
                        {line.message}
                      </p>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
              {/* Bottom bar */}
              <div className="px-4 py-3 border-t border-border flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-1.5 text-secondary">
                  <Mic size={14} />
                  <span className="text-xs">Admin view</span>
                </div>
                {session?.status === "active" && (
                  <button
                    onClick={handleEndCall}
                    disabled={ending}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
                  >
                    {ending ? (
                      <><Loader2 size={12} className="animate-spin" /> Ending…</>
                    ) : (
                      <><PhoneOff size={12} /> End Call</>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* ── Column 2: Captured Fields ── */}
            <div className="flex flex-col border-r border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex-shrink-0">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wide">Captured Fields</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <FieldCard
                  label="Category"
                  value={session?.category}
                  sourceLabel="RAG / FAISS"
                  status={session?.category ? "filled" : "pending"}
                />
                <FieldCard
                  label="Priority"
                  value={session?.priority ? session.priority.charAt(0).toUpperCase() + session.priority.slice(1) : null}
                  sourceLabel="GPT-4o-mini"
                  status={session?.priority ? "filled" : "pending"}
                />
                <FieldCard
                  label="Assigned Team"
                  value={session?.team_name}
                  sourceLabel="GPT-4o-mini"
                  status={session?.team_name ? "filled" : "pending"}
                />
                <FieldCard
                  label="Ticket Status"
                  value={
                    !session?.outcome ? null :
                    session.outcome === "resolved" ? "Resolved" :
                    session.outcome === "escalated" ? "Open" : "Abandoned"
                  }
                  sourceLabel="ticket_service.py"
                  status={session?.outcome ? "filled" : "pending"}
                />
                <FieldCard
                  label="Ticket Number"
                  value={session?.ticket_number}
                  sourceLabel="Supabase"
                  status={session?.ticket_number ? "filled" : "pending"}
                />
              </div>

              {/* Call Phase bar */}
              <div className="px-4 py-3 border-t border-border flex-shrink-0">
                <p className="text-[10px] font-semibold text-secondary uppercase tracking-wide mb-2">Call Phase</p>
                <div className="space-y-1">
                  {PHASE_LABELS.map((label, idx) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        idx < phaseIdx ? "bg-green-400" :
                        idx === phaseIdx ? "bg-accent" :
                        "bg-gray-200"
                      }`} />
                      <span className={`text-xs ${
                        idx === phaseIdx ? "text-accent font-semibold" :
                        idx < phaseIdx ? "text-green-600" :
                        "text-gray-400"
                      }`}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Column 3: Resolution Steps ── */}
            <div className="flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex-shrink-0">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wide">Resolution Steps</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {mergedSteps.length === 0 ? (
                  <p className="text-sm text-secondary">
                    {session?.category ? "Loading steps…" : "Waiting for KB match…"}
                  </p>
                ) : (
                  mergedSteps.map((step, i) => (
                    <StepRow key={step.node_id || i} step={step} log={step.log} />
                  ))
                )}

                <OutcomePanel session={session} steps={mergedSteps} />
              </div>

              {/* Data sources legend */}
              <div className="px-4 py-3 border-t border-border flex-shrink-0">
                <p className="text-[10px] font-semibold text-secondary uppercase tracking-wide mb-2">Data Sources</p>
                <div className="space-y-1">
                  {DATA_SOURCES.map(({ label, desc }) => (
                    <div key={label} className="flex items-baseline gap-1.5">
                      <span className="text-[10px] font-semibold text-accent flex-shrink-0">{label}</span>
                      <span className="text-[10px] text-secondary">— {desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
