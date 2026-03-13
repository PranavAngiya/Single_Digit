export default function KpiCard({ label, value, color = "text-primary", sub }) {
  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary mb-1">{label}</p>
      <p className={`text-3xl font-semibold ${color}`}>{value ?? "—"}</p>
      {sub && <p className="text-xs text-secondary mt-1">{sub}</p>}
    </div>
  );
}
