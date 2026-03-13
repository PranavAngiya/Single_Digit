import { Handle, Position } from "reactflow";

export function CategoryNode({ data }) {
  return (
    <div style={{ background: "#5a6acf18", border: "1.5px solid #5a6acf", borderRadius: 8, padding: "6px 12px", minWidth: 150, textAlign: "center" }}>
      <Handle type="source" position={Position.Right} style={{ background: "#5a6acf" }} />
      <p style={{ fontSize: 12, fontWeight: 700, color: "#273240", margin: 0 }}>{data.label}</p>
      <p style={{ fontSize: 10, color: "#5a6acf", margin: "2px 0 0" }}>{data.ticket_count} tickets</p>
    </div>
  );
}

export function ResolutionNode({ data }) {
  const attempts = data.attempt_count ?? -1;
  const hasData = attempts > 0;
  const rate = data.success_rate ?? 0;
  return (
    <div style={{ background: "#eff6ff", border: "1.5px solid #5a6acf", borderRadius: 8, padding: "6px 12px", minWidth: 150, textAlign: "center" }}>
      <Handle type="target" position={Position.Left} style={{ background: "#5a6acf" }} />
      <Handle type="source" position={Position.Right} style={{ background: "#5a6acf" }} />
      <p style={{ fontSize: 11, fontWeight: 600, color: "#273240", margin: 0, lineHeight: 1.3 }}>{data.label}</p>
      {hasData
        ? <p style={{ fontSize: 10, color: "#5a6acf", margin: "2px 0 0" }}>{Math.round(rate * 100)}% resolved</p>
        : <p style={{ fontSize: 10, color: "#5a6acf", margin: "2px 0 0" }}>No attempts yet</p>
      }
    </div>
  );
}

export function KBNode({ data }) {
  const c = data.is_resolvable ? "#5a6acf" : "#94a3b8";
  const bg = data.is_resolvable ? "#5a6acf18" : "#94a3b810";
  return (
    <div style={{ background: bg, border: `1.5px solid ${c}`, borderRadius: 8, padding: "6px 12px", minWidth: 150, textAlign: "center" }}>
      <Handle type="source" position={Position.Right} style={{ background: c }} />
      <Handle type="target" position={Position.Left} style={{ background: c }} />
      <p style={{ fontSize: 11, fontWeight: 700, color: "#273240", margin: 0 }}>{data.label}</p>
      <p style={{ fontSize: 10, color: c, margin: "2px 0 0" }}>
        {data.is_resolvable ? `${data.step_count} steps · ` : "No resolution · "}{data.ticket_count} tickets
      </p>
    </div>
  );
}

export function TicketNode({ data }) {
  const pc = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" }[data.priority] || "#94a3b8";
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${pc}`, borderRadius: 8, padding: "5px 10px", minWidth: 150, maxWidth: 200, textAlign: "center" }}>
      <Handle type="target" position={Position.Left} style={{ background: pc }} />
      <Handle type="source" position={Position.Right} style={{ background: pc }} />
      <p style={{ fontSize: 10, color: "#737b8b", margin: 0, fontFamily: "monospace" }}>{data.ticket_number}</p>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#273240", margin: "1px 0 0", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.label}</p>
    </div>
  );
}

export function CenterNode({ data }) {
  return (
    <div style={{ background: "#5a6acf", border: "2px solid #3d4fb5", borderRadius: 10, padding: "8px 14px", minWidth: 160, textAlign: "center", boxShadow: "0 2px 8px #5a6acf44" }}>
      <Handle type="source" position={Position.Right} style={{ background: "#fff" }} />
      <p style={{ fontSize: 10, color: "#c7cef5", margin: 0, fontFamily: "monospace" }}>{data.ticket_number}</p>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: "2px 0 0", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.label}</p>
    </div>
  );
}

export function SimilarNode({ data }) {
  return (
    <div style={{ background: "#f0fdf4", border: "1.5px dashed #22c55e", borderRadius: 8, padding: "5px 10px", minWidth: 150, textAlign: "center" }}>
      <Handle type="target" position={Position.Left} style={{ background: "#22c55e" }} />
      <p style={{ fontSize: 10, color: "#737b8b", margin: 0, fontFamily: "monospace" }}>{data.ticket_number}</p>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#273240", margin: "1px 0 0", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.label}</p>
      {data.similarity != null && (
        <p style={{ fontSize: 10, color: "#22c55e", margin: "1px 0 0" }}>{Math.round(data.similarity * 100)}% similar</p>
      )}
    </div>
  );
}

export function StepNode({ data }) {
  const tried = data.tried;
  const attempts = data.attempt_count ?? -1;
  const hasData = attempts > 0;
  const rate = data.success_rate ?? null;
  const bg = tried ? "#fef9c3" : "#eff6ff";
  const border = tried ? "#eab308" : "#5a6acf";
  const textColor = tried ? "#eab308" : "#5a6acf";
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 8, padding: "6px 12px", minWidth: 150, textAlign: "center" }}>
      <Handle type="target" position={Position.Left} style={{ background: border }} />
      <Handle type="source" position={Position.Right} style={{ background: border }} />
      <p style={{ fontSize: 11, fontWeight: 600, color: "#273240", margin: 0, lineHeight: 1.3 }}>{data.label}</p>
      {tried
        ? <p style={{ fontSize: 10, color: "#eab308", margin: "2px 0 0" }}>Tried — no result</p>
        : hasData
          ? <p style={{ fontSize: 10, color: textColor, margin: "2px 0 0" }}>{Math.round(rate * 100)}% success rate</p>
          : <p style={{ fontSize: 10, color: textColor, margin: "2px 0 0" }}>No attempts yet</p>
      }
    </div>
  );
}

export function EscalationNode({ data }) {
  const tried = data.tried;
  return (
    <div style={{ background: "#fee2e2", border: "1.5px solid #ef4444", borderRadius: 8, padding: "6px 12px", minWidth: 150, textAlign: "center" }}>
      <Handle type="target" position={Position.Left} style={{ background: "#ef4444" }} />
      <p style={{ fontSize: 11, fontWeight: 600, color: "#273240", margin: 0, lineHeight: 1.3 }}>{data.label}</p>
      {tried
        ? <p style={{ fontSize: 10, color: "#ef4444", margin: "2px 0 0" }}>Tried — did not work</p>
        : <p style={{ fontSize: 10, color: "#ef4444", margin: "2px 0 0" }}>Escalation path</p>
      }
    </div>
  );
}

export const nodeTypes = {
  category: CategoryNode,
  resolution: ResolutionNode,
  kb: KBNode,
  ticket: TicketNode,
  center: CenterNode,
  similar: SimilarNode,
  step: StepNode,
  escalation: EscalationNode,
};
