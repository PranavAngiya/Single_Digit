import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, ExternalLink, BookOpen, GitFork, X } from "lucide-react";
import api from "../lib/api";
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState } from "reactflow";
import "reactflow/dist/style.css";
import dagre from "@dagrejs/dagre";
import { nodeTypes } from "./ResolutionMapNodes";

const PAGE_SIZE = 20;

// Module-level graph cache — shared across all InlineTreePanel instances on the page.
// Avoids re-fetching the full graph every time a card's map is opened.
const _graphCache = { data: null, expiresAt: 0, promise: null };
const GRAPH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchGraphCached() {
  const now = Date.now();
  if (_graphCache.data && now < _graphCache.expiresAt) return _graphCache.data;
  if (_graphCache.promise) return _graphCache.promise; // deduplicate concurrent fetches
  _graphCache.promise = api.get("/api/helpdesk/dashboard/resolution/graph")
    .then(r => {
      _graphCache.data = r.data;
      _graphCache.expiresAt = Date.now() + GRAPH_CACHE_TTL_MS;
      _graphCache.promise = null;
      return r.data;
    })
    .catch(err => {
      _graphCache.promise = null;
      throw err;
    });
  return _graphCache.promise;
}

// ── Exact same layout/build pipeline as ResolutionMap.jsx ──────────────────
const NODE_W = 170;
const NODE_H = 64;

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

function buildFlowData(data) {
  const seenIds = new Map();
  const labelToId = new Map();
  const deduped = [];
  (data.nodes || []).forEach(n => {
    let effectiveId = n.id;
    if (n.type === "category") {
      const key = (n.label || "").trim().toLowerCase();
      if (labelToId.has(key)) {
        effectiveId = labelToId.get(key);
        const idx = seenIds.get(effectiveId);
        if (idx !== undefined) {
          deduped[idx].data.ticket_count = (deduped[idx].data.ticket_count || 0) + (n.ticket_count || 0);
        }
        return;
      }
      labelToId.set(key, effectiveId);
    }
    if (seenIds.has(effectiveId)) return;
    seenIds.set(effectiveId, deduped.length);
    deduped.push({ id: effectiveId, type: n.type, data: { ...n }, position: { x: 0, y: 0 } });
  });

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

  const seenEdges = new Set();
  const uniqueEdges = rawEdges.filter(e => {
    const key = `${e.source}||${e.target}`;
    if (seenEdges.has(key)) return false;
    seenEdges.add(key);
    return true;
  });

  return { flowNodes: applyDagreLayout(deduped, uniqueEdges, "LR"), flowEdges: uniqueEdges };
}

// ── Exact same SidePanel as ResolutionMap.jsx ──────────────────────────────
function SidePanel({ node, onClose }) {
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
            </div>
          </>
        )}
        {type === "kb" && (
          <>
            <div><p className="text-xs text-secondary uppercase font-semibold mb-1">Topic</p><p className="text-primary">{d.label}</p></div>
            {d.product && <div><p className="text-xs text-secondary uppercase font-semibold mb-1">Product</p><p className="text-primary">{d.product}</p></div>}
            {d.ticket_count != null && <div><p className="text-xs text-secondary uppercase font-semibold mb-1">Linked Tickets</p><p className="text-2xl font-bold text-accent">{d.ticket_count}</p></div>}
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

// ── InlineTreePanel: identical to ResolutionMap global mode, filtered to one tree ──
function InlineTreePanel({ treeId }) {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const onNodeClick = useCallback((_, node) => setSelectedNode(node), []);

  useEffect(() => {
    setLoading(true);
    setSelectedNode(null);
    // Fetch the global graph (same endpoint ResolutionMap uses) then filter to this tree.
    // The backend prefixes all nodes for a tree as cat-{treeId[:8]} and node-{nodeId[:8]}.
    fetchGraphCached().then(graphData => {
      const allNodes = graphData.nodes || [];
      const allEdges = graphData.edges || [];

      // The category node id for this tree is cat-{treeId[:8]}
      const catId = `cat-${treeId.slice(0, 8)}`;

      // Collect all node ids reachable from this category node via BFS
      const edgesBySource = {};
      allEdges.forEach(e => {
        if (!edgesBySource[e.source]) edgesBySource[e.source] = [];
        edgesBySource[e.source].push(e.target);
      });
      const reachable = new Set([catId]);
      const queue = [catId];
      while (queue.length > 0) {
        const cur = queue.shift();
        (edgesBySource[cur] || []).forEach(t => {
          if (!reachable.has(t)) { reachable.add(t); queue.push(t); }
        });
      }

      const filteredNodes = allNodes.filter(n => reachable.has(n.id));
      const filteredEdges = allEdges.filter(e => reachable.has(e.source) && reachable.has(e.target));

      // Collapse the root tree node: the single node directly connected FROM the category
      // node often just repeats the problem title. Remove it and rewire its children to catId.
      const rootTreeNodeIds = new Set(
        filteredEdges.filter(e => e.source === catId).map(e => e.target)
      );
      let collapseNodeId = null;
      if (rootTreeNodeIds.size === 1) {
        const candidateId = [...rootTreeNodeIds][0];
        const candidateNode = filteredNodes.find(n => n.id === candidateId);
        const catNode = filteredNodes.find(n => n.id === catId);
        // Collapse if the root node label closely matches the category label (it's just a title repeat)
        if (candidateNode && catNode) {
          const catLabel = (catNode.label || "").trim().toLowerCase();
          const candidateLabel = (candidateNode.label || "").trim().toLowerCase();
          if (
            catLabel === candidateLabel ||
            catLabel.includes(candidateLabel) ||
            candidateLabel.includes(catLabel)
          ) {
            collapseNodeId = candidateId;
          }
        }
      }

      let finalNodes = filteredNodes;
      let finalEdges = filteredEdges;
      if (collapseNodeId) {
        // Remove the collapsed node; rewire edges that had it as source to use catId instead
        finalNodes = filteredNodes.filter(n => n.id !== collapseNodeId);
        finalEdges = filteredEdges
          .filter(e => e.target !== collapseNodeId) // remove edge catId → collapseNodeId
          .map(e => e.source === collapseNodeId ? { ...e, source: catId, id: `e-${catId}-${e.target}` } : e);
      }

      const { flowNodes: fn, flowEdges: fe } = buildFlowData({ nodes: finalNodes, edges: finalEdges });
      setFlowNodes(fn);
      setFlowEdges(fe);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [treeId]);

  const miniMapColor = n => {
    if (n.type === "category") return "#5a6acf";
    if (n.type === "escalation") return "#ef4444";
    return "#94a3b8";
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden relative" style={{ height: 420 }}>
      {loading ? (
        <div className="h-full flex items-center justify-center text-secondary text-sm">Loading resolution map…</div>
      ) : flowNodes.length === 0 ? (
        <div className="h-full flex items-center justify-center text-secondary text-sm">No map data for this entry.</div>
      ) : (
        <ReactFlow
          nodes={flowNodes} edges={flowEdges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView fitViewOptions={{ padding: 0.2 }}
        >
          <Background color="#e8eaed" gap={16} variant="dots" />
          <Controls />
          <MiniMap nodeColor={miniMapColor} maskColor="rgba(241,242,247,0.7)" />
        </ReactFlow>
      )}
      <SidePanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      {/* Legend — same as ResolutionMap global mode */}
      {!loading && flowNodes.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 px-4 py-1.5 bg-white border-t border-border flex gap-4 text-xs text-secondary" style={{ zIndex: 5 }}>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "#5a6acf18", border: "1.5px solid #5a6acf" }} /> Category</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "#f8fafc", border: "1.5px solid #94a3b8" }} /> Step</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "#fee2e2", border: "1.5px solid #ef4444" }} /> Escalation</span>
        </div>
      )}
    </div>
  );
}

function KBCard({ item, resolvedTreeId }) {
  const [showMore, setShowMore] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const navigate = useNavigate();

  const steps = Array.isArray(item.resolution_steps)
    ? item.resolution_steps
    : (typeof item.resolution_steps === "string"
        ? item.resolution_steps.split("\n").filter(Boolean)
        : []);

  const sourceCount = (item.source_ticket_ids || []).length;
  const hasTree = !!resolvedTreeId;
  const hasSteps = steps.length > 0;

  function toggleSteps() {
    const next = !stepsOpen;
    setStepsOpen(next);
    if (next && hasTree) setMapOpen(true);
    if (!next) setMapOpen(false);
  }

  return (
    <div className="bg-white border border-border rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
              style={{ background: "#5a6acf18", color: "#5a6acf" }}
            >
              {item.topic}
            </span>
            <span className="text-xs text-secondary">{item.product}</span>
          </div>
        </div>
      </div>

      {/* Problem description */}
      {item.problem_description && (
        <div>
          <p className={`text-sm text-secondary leading-relaxed ${showMore ? "" : "line-clamp-2"}`}>
            {item.problem_description.replace(/^(User is experiencing:|The user is experiencing:)\s*/i, "")}
          </p>
          {item.problem_description.length > 120 && (
            <button
              onClick={() => setShowMore(v => !v)}
              className="flex items-center gap-0.5 text-xs text-accent hover:underline mt-1"
            >
              {showMore ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show more</>}
            </button>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-border flex-wrap">
        {hasSteps && (
          <button
            onClick={toggleSteps}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <BookOpen size={12} />
            {stepsOpen ? "Hide steps" : `${steps.length} resolution step${steps.length !== 1 ? "s" : ""}`}
          </button>
        )}
        {!hasSteps && hasTree && (
          <button
            onClick={() => setMapOpen(v => !v)}
            className="flex items-center gap-1 text-xs font-medium hover:underline"
            style={{ color: "#8b5cf6" }}
          >
            <GitFork size={11} />
            {mapOpen ? "Hide resolution map" : "View resolution map"}
          </button>
        )}
        {sourceCount > 0 && (
          <button
            onClick={() => navigate(`/tickets?source_kb_id=${item.id}`)}
            className="flex items-center gap-1 text-xs font-medium hover:underline"
            style={{ color: "#16a34a" }}
          >
            <ExternalLink size={11} />
            {sourceCount} linked ticket{sourceCount !== 1 ? "s" : ""}
          </button>
        )}
        <span className="ml-auto text-xs text-secondary">
          {new Date(item.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Resolution steps */}
      {stepsOpen && hasSteps && (
        <div className="bg-sidebar rounded-lg p-3 space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-2.5 text-sm text-primary">
              <span
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                style={{ background: "#5a6acf" }}
              >
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </div>
          ))}
        </div>
      )}

      {/* Inline resolution map — shown when steps open (if tree exists) or toggled separately */}
      {mapOpen && hasTree && (
        <InlineTreePanel treeId={resolvedTreeId} />
      )}
    </div>
  );
}

export default function KBPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [topicToTreeId, setTopicToTreeId] = useState({});
  const debounceRef = useRef(null);

  useEffect(() => {
    api.get("/api/helpdesk/kb/trees").then(r => {
      const map = {};
      (r.data || []).forEach(tree => {
        if (tree.category) map[tree.category.trim().toLowerCase()] = tree.id;
        if (tree.problem_type) map[tree.problem_type.trim().toLowerCase()] = tree.id;
      });
      setTopicToTreeId(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.get("/api/helpdesk/kb/categories").then(r => {
      const data = r.data;
      if (Array.isArray(data)) setCategories(data);
      else if (data.topics) setCategories(data.topics);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchKB, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search, category, page]);

  async function fetchKB() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: PAGE_SIZE });
      if (search) params.set("search", search);
      if (category) params.set("topic", category);
      const r = await api.get(`/api/helpdesk/kb?${params}`);
      setItems(r.data.items || []);
      setTotal(r.data.total || 0);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(setter) {
    return (val) => { setter(val); setPage(1); };
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const start = Math.min((page - 1) * PAGE_SIZE + 1, total);
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Knowledge Base</h1>
        <p className="text-sm text-secondary mt-1 max-w-2xl">
          Each entry represents a <strong className="text-primary">known problem cluster</strong> — a group of similar support tickets that share the same root cause and resolution path. Click "linked tickets" on any card to see all tickets that belong to that cluster.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={e => handleFilterChange(setSearch)(e.target.value)}
          placeholder="Search problems…"
          className="border border-border rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent w-72"
        />
        <select
          value={category}
          onChange={e => handleFilterChange(setCategory)(e.target.value)}
          className="border border-border rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent bg-white"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="ml-auto" />
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-xl p-4 space-y-2">
              <div className="h-4 w-32 bg-border rounded" />
              <div className="h-3 w-full bg-border rounded" />
              <div className="h-3 w-5/6 bg-border rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-8 text-center text-secondary text-sm">
          No entries match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {items.map(item => {
            const resolvedTreeId = item.kb_tree_id
              || topicToTreeId[(item.topic || "").trim().toLowerCase()]
              || topicToTreeId[(item.product || "").trim().toLowerCase()]
              || null;
            return <KBCard key={item.id} item={item} resolvedTreeId={resolvedTreeId} />;
          })}
        </div>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-secondary">
          <span>Showing {start}–{end} of {total} entries</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded border border-border disabled:opacity-40 hover:bg-white bg-white"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded border border-border disabled:opacity-40 hover:bg-white bg-white"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
