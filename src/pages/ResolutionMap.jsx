import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState } from "reactflow";
import "reactflow/dist/style.css";
import dagre from "@dagrejs/dagre";
import { X, RefreshCw, Search, BookOpen, Ticket, Network } from "lucide-react";
import api from "../lib/api";
import { nodeTypes } from "./ResolutionMapNodes";

const NODE_W = 170;
const NODE_H = 64;
const MODES = [
  { id: "global",  label: "Global",     Icon: Network,  desc: "Category → resolution overview" },
  { id: "kb",      label: "KB Cluster", Icon: BookOpen, desc: "KB entries → linked tickets" },
  { id: "ticket",  label: "Per-ticket", Icon: Ticket,   desc: "Single ticket neighborhood" },
];

function applyDagreLayout(nodes, edges, rankdir = "LR") {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir, ranksep: 90, nodesep: 45 });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map(n => {
    const { x, y } = g.node(n.id);
    return { ...n, position: { x: x - NODE_W / 2, y: y - NODE_H / 2 } };
  });
}

function buildFlowData(data, mode) {
  const rankdir = mode === "ticket" ? "TB" : "LR";

  // Deduplicate nodes: if two nodes share the same id, keep the first.
  // Also deduplicate category nodes that share the same label — merge them
  // (second category with same label reuses first's id so edges still connect).
  const seenIds = new Map(); // id → index in deduped
  const labelToId = new Map(); // category label → canonical id
  const deduped = [];
  (data.nodes || []).forEach(n => {
    let effectiveId = n.id;
    if (n.type === "category") {
      const key = (n.label || "").trim().toLowerCase();
      if (labelToId.has(key)) {
        effectiveId = labelToId.get(key);
        // merge ticket counts
        const idx = seenIds.get(effectiveId);
        if (idx !== undefined) {
          deduped[idx].data.ticket_count = (deduped[idx].data.ticket_count || 0) + (n.ticket_count || 0);
        }
        return; // skip adding a duplicate node
      }
      labelToId.set(key, effectiveId);
    }
    if (seenIds.has(effectiveId)) return;
    seenIds.set(effectiveId, deduped.length);
    deduped.push({ id: effectiveId, type: n.type, data: { ...n }, position: { x: 0, y: 0 } });
  });

  // Build a full originalId → canonicalId map for edges (handles merged category nodes)
  const idRemap = new Map();
  (data.nodes || []).forEach(n => {
    if (n.type === "category") {
      const key = (n.label || "").trim().toLowerCase();
      const canon = labelToId.get(key);
      if (canon) idRemap.set(n.id, canon);
    }
  });

  const rawEdges = (data.edges || []).map(e => {
    const src = idRemap.get(e.source) || e.source;
    const tgt = idRemap.get(e.target) || e.target;
    return {
      id: e.id || `${src}-${tgt}`,
      source: src, target: tgt, type: "smoothstep",
      label: e.label || undefined, animated: e.edge_type === "similar",
      style: { strokeWidth: Math.max(1, Math.min(4, Math.round((typeof e.weight === "number" ? e.weight : 1) * 3))), stroke: e.edge_type === "similar" ? "#22c55e" : "#c7cef5" },
      labelStyle: { fontSize: 10, fill: "#737b8b" }, labelBgStyle: { fill: "#fff", fillOpacity: 0.85 },
    };
  });

  // Remove duplicate edges (same source+target after remap)
  const seenEdges = new Set();
  const uniqueEdges = rawEdges.filter(e => {
    const key = `${e.source}||${e.target}`;
    if (seenEdges.has(key)) return false;
    seenEdges.add(key);
    return true;
  });

  return { flowNodes: applyDagreLayout(deduped, uniqueEdges, rankdir), flowEdges: uniqueEdges };
}

function SidePanel({ node, onClose, onDrillDown }) {
  const navigate = useNavigate();
  if (!node) return null;
  const d = node.data;
  const type = node.type;
  const rate = d.success_rate ?? 0;
  const rateColor = rate >= 0.8 ? "#22c55e" : rate >= 0.5 ? "#f97316" : "#ef4444";

  return (
    <div className="absolute top-0 right-0 h-full bg-white border-l border-border shadow-lg z-10 flex flex-col" style={{ width: 280 }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-primary truncate">{d.label}</p>
        <button onClick={onClose} className="text-secondary hover:text-primary"><X size={16} /></button>
      </div>
      <div className="p-4 space-y-3 overflow-y-auto flex-1 text-sm">
        {(type === "ticket" || type === "center" || type === "similar") && (
          <>
            {d.ticket_number && <div><p className="text-xs text-secondary uppercase font-semibold mb-1">Ticket #</p><p className="font-mono text-primary">{d.ticket_number}</p></div>}
            {d.status && <div><p className="text-xs text-secondary uppercase font-semibold mb-1">Status</p><p className="text-primary capitalize">{d.status}</p></div>}
            {d.priority && <div><p className="text-xs text-secondary uppercase font-semibold mb-1">Priority</p><p className="text-primary capitalize">{d.priority}</p></div>}
            {d.similarity != null && <div><p className="text-xs text-secondary uppercase font-semibold mb-1">Similarity</p><p className="text-green-600 font-semibold">{Math.round(d.similarity * 100)}%</p></div>}
            <div className="flex flex-col gap-2 pt-1">
              {d.ticket_id && <button onClick={() => navigate(`/tickets/${d.ticket_id}`)} className="w-full text-xs font-medium text-white bg-accent rounded-lg px-3 py-2 hover:opacity-90">View Ticket →</button>}
              {type !== "center" && onDrillDown && d.ticket_id && <button onClick={() => onDrillDown(d.ticket_id)} className="w-full text-xs font-medium text-accent border border-accent rounded-lg px-3 py-2 hover:bg-sidebar">Explore neighborhood</button>}
            </div>
          </>
        )}
        {type === "kb" && (
          <>
            <div><p className="text-xs text-secondary uppercase font-semibold mb-1">Topic</p><p className="text-primary">{d.label}</p></div>
            {d.product && <div><p className="text-xs text-secondary uppercase font-semibold mb-1">Product</p><p className="text-primary">{d.product}</p></div>}
            <div><p className="text-xs text-secondary uppercase font-semibold mb-1">Resolvable</p>
              <p className={d.is_resolvable ? "text-green-600 font-semibold" : "text-secondary"}>{d.is_resolvable ? `Yes — ${d.step_count} steps` : "No resolution path"}</p>
            </div>
            {d.ticket_count != null && <div><p className="text-xs text-secondary uppercase font-semibold mb-1">Linked Tickets</p><p className="text-2xl font-bold text-accent">{d.ticket_count}</p></div>}
            {d.match_score != null && <div><p className="text-xs text-secondary uppercase font-semibold mb-1">Match Score</p><p className="text-accent font-semibold">{Math.round(d.match_score * 100)}%</p></div>}
          </>
        )}
        {type === "category" && (
          <>
            <div><p className="text-xs text-secondary uppercase font-semibold mb-1">Category</p><p className="text-primary">{d.label}</p></div>
            <div><p className="text-xs text-secondary uppercase font-semibold mb-1">Total Tickets</p><p className="text-2xl font-bold text-accent">{d.ticket_count}</p></div>
          </>
        )}
        {(type === "resolution" || type === "step" || type === "escalation") && (
          <>
            <div><p className="text-xs text-secondary uppercase font-semibold mb-1">Step</p><p className="text-primary">{d.label}</p></div>
            {d.tried != null && (
              <div><p className="text-xs text-secondary uppercase font-semibold mb-1">Status on this ticket</p>
                <p className={d.worked ? "text-green-600 font-semibold" : d.tried ? "text-red-500 font-semibold" : "text-secondary"}>
                  {d.worked ? "✓ Worked" : d.tried ? "✗ Tried — did not work" : "Not yet tried"}
                </p>
                {d.tried_at && <p className="text-xs text-secondary mt-0.5">{new Date(d.tried_at).toLocaleString()}</p>}
              </div>
            )}
            <div>
              <p className="text-xs text-secondary uppercase font-semibold mb-1">Overall Success Rate</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-border rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${Math.round(rate * 100)}%`, background: rateColor }} /></div>
                <span className="text-sm font-bold" style={{ color: rateColor }}>{Math.round(rate * 100)}%</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResolutionMap() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("global");
  const [selectedNode, setSelectedNode] = useState(null);
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketResults, setTicketResults] = useState([]);
  const [ticketSearching, setTicketSearching] = useState(false);
  const [perTicketId, setPerTicketId] = useState(null);
  const searchDebounce = useRef(null);

  const applyData = useCallback((data, m) => {
    const { flowNodes, flowEdges } = buildFlowData(data, m);
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [setNodes, setEdges]);

  async function fetchGlobal() {
    setLoading(true); setSelectedNode(null);
    try { const r = await api.get("/api/helpdesk/dashboard/resolution/graph"); applyData(r.data, "global"); }
    finally { setLoading(false); }
  }
  async function fetchKBCluster() {
    setLoading(true); setSelectedNode(null);
    try {
      const r = await api.get("/api/helpdesk/dashboard/resolution/kb-cluster");
      applyData(r.data, "kb");
    } finally { setLoading(false); }
  }
  async function fetchPerTicket(tid) {
    setLoading(true); setSelectedNode(null);
    try { const r = await api.get(`/api/helpdesk/dashboard/resolution/per-ticket-path?ticket_id=${tid}`); applyData(r.data, "ticket"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (mode === "global") fetchGlobal();
    else if (mode === "kb") fetchKBCluster();
    else if (mode === "ticket" && perTicketId) fetchPerTicket(perTicketId);
    else if (mode === "ticket") { setNodes([]); setEdges([]); }
  }, [mode, perTicketId]);

  function handleTicketSearch(q) {
    setTicketSearch(q);
    clearTimeout(searchDebounce.current);
    if (!q.trim()) { setTicketResults([]); return; }
    searchDebounce.current = setTimeout(async () => {
      setTicketSearching(true);
      try {
        const r = await api.get(`/api/helpdesk/tickets?search=${encodeURIComponent(q)}&page_size=8`);
        setTicketResults(r.data.tickets || r.data.items || []);
      } catch { setTicketResults([]); }
      finally { setTicketSearching(false); }
    }, 300);
  }

  const onNodeClick = useCallback((_, node) => setSelectedNode(node), []);
  const miniMapColor = n => {
    if (n.type === "center" || n.type === "kb" || n.type === "category") return "#5a6acf";
    if (n.type === "escalation") return "#ef4444";
    if (n.type === "similar") return "#22c55e";
    return "#94a3b8";
  };
  function refresh() {
    if (mode === "global") fetchGlobal();
    else if (mode === "kb") fetchKBCluster();
    else if (mode === "ticket" && perTicketId) fetchPerTicket(perTicketId);
  }

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold text-primary">Resolution Map</h1>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs ml-2">
          {MODES.map(({ id, label, Icon, desc }) => (
            <button key={id} onClick={() => setMode(id)} title={desc}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors ${mode === id ? "bg-accent text-white" : "text-secondary hover:bg-sidebar"}`}>
              <Icon size={12} />{label}
            </button>
          ))}
        </div>
        {mode === "ticket" && (
          <div className="relative ml-1">
            <div className="flex items-center border border-border rounded-lg overflow-hidden bg-white">
              <Search size={13} className="ml-2.5 text-secondary shrink-0" />
              <input type="text" value={ticketSearch} onChange={e => handleTicketSearch(e.target.value)}
                placeholder="Search ticket…" className="px-2 py-1.5 text-xs text-primary focus:outline-none w-52" />
              {ticketSearching && <span className="mr-2 text-xs text-secondary animate-pulse">…</span>}
            </div>
            {ticketResults.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                {ticketResults.map(t => (
                  <button key={t.id} onClick={() => { setPerTicketId(t.id); setTicketSearch(t.subject || t.ticket_number); setTicketResults([]); }}
                    className="w-full text-left px-3 py-2 hover:bg-sidebar border-b border-border last:border-0">
                    <span className="font-mono text-xs text-secondary mr-1">{t.ticket_number}</span>
                    <span className="text-xs text-primary">{t.subject}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button onClick={refresh} className="ml-auto flex items-center gap-1.5 text-sm text-accent border border-border rounded-lg px-3 py-1.5 hover:bg-sidebar">
          <RefreshCw size={14} />Refresh
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs text-secondary flex-wrap">
        {mode === "global" && (<>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "#5a6acf18", border: "1.5px solid #5a6acf" }} /> Category</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "#f8fafc", border: "1.5px solid #94a3b8" }} /> Step</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "#dcfce7", border: "1.5px solid #22c55e" }} /> Resolved</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "#fee2e2", border: "1.5px solid #ef4444" }} /> Escalation</span>
        </>)}
        {mode === "kb" && (<>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "#5a6acf18", border: "1.5px solid #5a6acf" }} /> KB entry (resolvable)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "#94a3b810", border: "1.5px solid #94a3b8" }} /> KB entry (no steps)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block bg-white" style={{ border: "1px solid #d1d5db" }} /> Ticket</span>
        </>)}
        {mode === "ticket" && (<>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "#5a6acf" }} /> Ticket</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "#f8fafc", border: "1.5px solid #94a3b8" }} /> Not tried</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "#fef9c3", border: "1.5px solid #eab308" }} /> Tried</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "#dcfce7", border: "1.5px solid #22c55e" }} /> Worked</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "#fee2e2", border: "1.5px solid #ef4444" }} /> Failed / Escalation</span>
        </>)}
      </div>

      <div className="relative bg-white border border-border rounded-xl overflow-hidden flex-1" style={{ height: "calc(100vh - 220px)" }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-20">
            <span className="text-secondary text-sm">Loading graph…</span>
          </div>
        )}
        {mode === "ticket" && !perTicketId && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-secondary text-sm gap-2 z-10">
            <Search size={32} className="opacity-30" />
            <p>Search for a ticket above to see its resolution path</p>
            <p className="text-xs opacity-60">Shows all KB decision tree steps — green = worked, red = tried &amp; failed, grey = not yet tried</p>
          </div>
        )}
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes} onNodeClick={onNodeClick} fitView fitViewOptions={{ padding: 0.2 }}>
          <Background color="#e8eaed" gap={16} variant="dots" />
          <Controls />
          <MiniMap nodeColor={miniMapColor} maskColor="rgba(241,242,247,0.7)" />
        </ReactFlow>
        <SidePanel node={selectedNode} onClose={() => setSelectedNode(null)}
          onDrillDown={tid => { setMode("ticket"); setPerTicketId(tid); setTicketSearch(""); setTicketResults([]); }} />
      </div>
    </div>
  );
}
