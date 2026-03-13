import { useState } from 'react'
import {
  Play, Shield, CheckCircle2, Brain, Database, Zap, ArrowRight, Download,
  Eye, X, Code, Maximize2,
} from 'lucide-react'
import { getDownloadUrl } from '../../lib/pipelineApi'

const DQ_RULES = [
  { icon: '📞', title: 'Phone Number', target: '(XXX) XXX-XXXX', desc: 'Strips +1, dots, dashes. 10-digit US formatted.', before: ['+12948497939', '250-7437'], after: ['(294) 849-7939', '(250) 743-7XXX'], cardCls: 'bg-[rgba(90,106,207,0.07)] border border-[rgba(90,106,207,0.15)]', afterColor: 'text-emerald-600 font-semibold' },
  { icon: '📅', title: 'Date Format', target: 'YYYY-MM-DD (ISO 8601)', desc: 'Parses MM/DD/YYYY, DD-MM-YYYY, text dates.', before: ['11/08/2022', '06-04-2022'], after: ['2022-11-08', '2022-06-04'], cardCls: 'bg-violet-50 border border-violet-100', afterColor: 'text-emerald-600 font-semibold' },
  { icon: '💰', title: 'Amount / Currency', target: 'Float (no symbols)', desc: 'Strips $, commas. "TBD" → 0.0', before: ['$125,000.50', 'TBD'], after: ['125000.5', '0.0'], cardCls: 'bg-emerald-50 border border-emerald-100', afterColor: 'text-emerald-600 font-semibold' },
  { icon: '🏷️', title: 'Stage Mapping', target: 'Salesforce stages', desc: 'Case-insensitive. Unknown → Prospecting.', before: ['CLOSED / won', 'unknown'], after: ['Closed Won', 'Prospecting'], cardCls: 'bg-amber-50 border border-amber-100', afterColor: 'text-emerald-600 font-semibold' },
  { icon: '🌍', title: 'Country', target: 'Full standard name', desc: 'Maps abbreviations & variations.', before: ['USA', 'UK'], after: ['United States', 'United Kingdom'], cardCls: 'bg-teal-50 border border-teal-100', afterColor: 'text-emerald-600 font-semibold' },
  { icon: '🔗', title: 'FK Validation', target: 'Must exist in parent', desc: 'Contact.AccountId → Accounts. Opp.ContactId → Contacts.', before: ['ACC-8888', 'CON-9999'], after: ['Orphan ✗', 'Orphan ✗'], cardCls: 'bg-red-50 border border-red-100', afterColor: 'text-red-600 font-semibold' },
]

const TYPE_COLORS = {
  phone: 'bg-[rgba(90,106,207,0.12)] text-accent', date: 'bg-violet-100 text-violet-700',
  amount: 'bg-emerald-100 text-emerald-700', email: 'bg-sky-100 text-sky-700',
  stage: 'bg-amber-100 text-amber-700', name: 'bg-pink-100 text-pink-700',
  country: 'bg-teal-100 text-teal-700',
}

export default function PipelineView({ mappingData, transformData, transformReport, columnAnalysis, onTransform }) {
  const [showCodeFor, setShowCodeFor] = useState(null)
  const [showRules, setShowRules] = useState(false)
  const [codeModal, setCodeModal] = useState(null)

  const STAGES = [
    { n: '1', label: 'Analyze Columns', sub: 'Detect types & patterns' },
    { n: '2', label: 'LLM Code Gen', sub: 'Dynamic pandas transforms' },
    { n: '3', label: 'Apply Transforms', sub: 'Normalize all fields' },
    { n: '4', label: 'Build SF Objects', sub: 'Map to Salesforce schema' },
    { n: '5', label: 'Validate Relations', sub: 'Check FK references' },
    { n: '6', label: 'Route Exceptions', sub: 'Flag & save failures' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary">Hybrid pipeline: LLM-generated dynamic transforms + deterministic ETL.</p>
        <button onClick={onTransform} disabled={!mappingData} className="btn-primary flex items-center gap-2">
          <Play className="w-4 h-4" /> Run Hybrid Pipeline
        </button>
      </div>

      {/* Stage bar */}
      <div className="card">
        <div className="flex items-center gap-1">
          {STAGES.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 flex-1 rounded-lg px-3 py-2.5 ${transformData ? 'bg-emerald-50' : 'bg-sidebar'}`}>
                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${transformData ? 'bg-emerald-500 text-white' : 'bg-border text-secondary'}`}>
                  {transformData ? '✓' : s.n}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary truncate">{s.label}</p>
                  <p className="text-xs text-secondary truncate">{s.sub}</p>
                </div>
              </div>
              {i < STAGES.length - 1 && <ArrowRight className="w-3 h-3 text-border mx-0.5 shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* DQ Rules Panel */}
      <div className="card">
        <button onClick={() => setShowRules(!showRules)} className="w-full flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" /> Data Quality Rules &amp; Transform Standards
          </h3>
          <span className="text-xs text-secondary">{showRules ? 'Hide' : 'Show'}</span>
        </button>
        {showRules && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {DQ_RULES.map(rule => (
              <div key={rule.title} className={`rounded-lg p-4 ${rule.cardCls}`}>
                <p className="text-xs font-semibold text-primary mb-1">{rule.icon} {rule.title}</p>
                <p className="text-xs text-primary mb-0.5"><span className="font-semibold">Target:</span> {rule.target}</p>
                <p className="text-xs text-secondary mb-2">{rule.desc}</p>
                <div className="bg-white rounded-md p-2 space-y-0.5 font-mono text-xs border border-border">
                  {rule.before.map((b, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-red-400 line-through">{b}</span>
                      <ArrowRight className="w-2.5 h-2.5 text-border" />
                      <span className={rule.afterColor}>{rule.after[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dynamic Transform Code */}
      {transformReport && (
        <div className="card animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-600" /> LLM-Generated Transform Code
              <span className="badge-purple text-xs">Dynamic</span>
            </h3>
            <a href={getDownloadUrl('transform-report.pdf')} target="_blank" rel="noreferrer"
              className="btn-secondary text-xs flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Download PDF
            </a>
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            {Object.entries(transformReport).map(([ft, data]) => (
              <button
                key={ft}
                onClick={() => setShowCodeFor(showCodeFor === ft ? null : ft)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  showCodeFor === ft
                    ? 'bg-violet-50 border-violet-200 text-violet-700'
                    : 'bg-white border-border text-secondary hover:bg-sidebar'
                }`}
              >
                <span className="capitalize font-semibold">{ft}</span>
                <span className="ml-1.5 text-violet-600">{(data?.summary?.llm_generated || 0) + (data?.summary?.cached || 0)} LLM</span>
                {(data?.summary?.fallback || 0) > 0 && <span className="text-secondary ml-1">/ {data.summary.fallback} fallback</span>}
              </button>
            ))}
          </div>

          {showCodeFor && transformReport[showCodeFor] && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center gap-5 bg-sidebar rounded-lg p-3 border border-border text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500" /> LLM Generated: <b className="text-primary">{(transformReport[showCodeFor].summary?.llm_generated || 0) + (transformReport[showCodeFor].summary?.cached || 0)}</b></span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-secondary" /> Fallback: <b className="text-primary">{transformReport[showCodeFor].summary?.fallback}</b></span>
              </div>

              {transformReport[showCodeFor].summary?.column_details?.map((d, i) => (
                <div key={i} className={`rounded-lg border p-4 ${
                  d.transform_source === 'llm' || d.transform_source === 'cache' ? 'bg-violet-50 border-violet-100' : 'bg-sidebar border-border'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-bold font-mono text-primary">{d.column}</code>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[d.detected_type] || 'bg-sidebar text-secondary'}`}>{d.detected_type}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      d.transform_source === 'llm' || d.transform_source === 'cache' ? 'bg-violet-100 text-violet-700' : 'bg-sidebar text-secondary'
                    }`}>{d.transform_source === 'cache' ? 'LLM' : (d.transform_source || '').toUpperCase()}</span>
                  </div>
                  {d.code_preview && d.code_preview !== 'hardcoded' ? (
                    <div className="relative">
                      <pre className="bg-slate-900 text-green-400 rounded-lg p-3 text-[11px] font-mono overflow-x-auto max-h-60 overflow-y-auto leading-relaxed whitespace-pre-wrap">{d.code_preview}</pre>
                      <button
                        onClick={() => setCodeModal({ column: d.column, type: d.detected_type, source: d.transform_source, code: d.code_preview })}
                        className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-md px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <Maximize2 className="w-3 h-3" /> Full Code
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-secondary italic">Hardcoded fallback transform</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Code Preview Modal */}
      {codeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                  <Code className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <code className="font-mono">{codeModal.column}</code>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[codeModal.type] || 'bg-sidebar text-secondary'}`}>{codeModal.type}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      codeModal.source === 'llm' || codeModal.source === 'cache' ? 'bg-violet-100 text-violet-700' : 'bg-sidebar text-secondary'
                    }`}>{codeModal.source === 'cache' ? 'LLM (cached)' : codeModal.source.toUpperCase()}</span>
                  </h3>
                  <p className="text-xs text-secondary">LLM-generated transform function</p>
                </div>
              </div>
              <button onClick={() => setCodeModal(null)} className="text-secondary hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="bg-slate-900 text-green-400 rounded-lg p-5 text-xs font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">{codeModal.code}</pre>
            </div>
            <div className="flex items-center justify-between px-6 py-3 border-t border-border shrink-0">
              <p className="text-xs text-secondary">{codeModal.code.split('\n').length} lines</p>
              <button onClick={() => navigator.clipboard.writeText(codeModal.code)} className="btn-secondary text-xs py-1.5 px-3">
                Copy Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
