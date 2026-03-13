import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Play, RefreshCw } from 'lucide-react'

function parseIssueFields(issues) {
  const fields = []
  for (const issue of issues) {
    if (issue.includes('Missing Account Name')) fields.push({ field: 'company_name', type: 'missing', message: 'Account name is required' })
    else if (issue.includes('Missing Contact LastName')) fields.push({ field: 'last_name', type: 'missing', message: 'Contact last name required' })
    else if (issue.includes('Missing Lead LastName')) fields.push({ field: 'last_name', type: 'missing', message: 'Lead last name required' })
    else if (issue.includes('Missing Lead Company')) fields.push({ field: 'company', type: 'missing', message: 'Lead company required' })
    else if (issue.includes('Missing AccountId')) fields.push({ field: 'AccountId', type: 'missing_fk', message: 'AccountId required' })
    else if (issue.includes('Orphan') && issue.includes('AccountId')) {
      const m = issue.match(/AccountId '([^']+)'/)
      fields.push({ field: 'AccountId', type: 'orphan', message: `AccountId '${m?.[1] || ''}' not found` })
    } else if (issue.includes('Orphan') && issue.includes('ContactId')) {
      const m = issue.match(/ContactId '([^']+)'/)
      fields.push({ field: 'ContactId', type: 'orphan', message: `ContactId '${m?.[1] || ''}' not found` })
    } else if (issue.includes('Non-numeric amount')) fields.push({ field: 'amount', type: 'format', message: 'Must be numeric' })
    else if (issue.includes('Invalid stage')) fields.push({ field: 'stage', type: 'format', message: 'Invalid Salesforce stage' })
    else fields.push({ field: '', type: 'other', message: issue })
  }
  return fields
}

const TYPE_STYLE = {
  orphan: { badge: 'bg-red-50 text-red-700 ring-red-200', label: 'Orphan FK' },
  missing: { badge: 'bg-amber-50 text-amber-700 ring-amber-200', label: 'Missing' },
  missing_fk: { badge: 'bg-orange-50 text-orange-700 ring-orange-200', label: 'Missing FK' },
  format: { badge: 'bg-[rgba(90,106,207,0.1)] text-accent ring-[rgba(90,106,207,0.2)]', label: 'Format' },
  other: { badge: 'bg-sidebar text-secondary ring-border', label: 'Issue' },
}

export default function ExceptionsView({ resultsData, onResolve, onRerun }) {
  const [fixValues, setFixValues] = useState({})
  const [resolvedKeys, setResolvedKeys] = useState(new Set())
  const [resolving, setResolving] = useState(null)
  const [toast, setToast] = useState(null)
  const [rerunning, setRerunning] = useState(false)

  const exceptions = resultsData?.exceptions || []
  const key = (exc, i) => `${exc.row_index}-${i}`
  const setFix = (k, field, val) =>
    setFixValues(prev => ({ ...prev, [k]: { ...(prev[k] || {}), [field]: val } }))

  const handleFix = async (exc, idx) => {
    const k = key(exc, idx)
    const fixes = fixValues[k] || {}
    const fields = parseIssueFields(exc.issues || [])
    if (fields.filter(f => f.field).some(f => !fixes[f.field])) return
    try {
      setResolving(k)
      for (const [field, val] of Object.entries(fixes)) {
        if (val) await onResolve(exc.row_index, field, val)
      }
      setResolvedKeys(prev => new Set([...prev, k]))
      setToast(`Row ${exc.row_index} fixed — click "Rerun Pipeline" to validate`)
      setTimeout(() => setToast(null), 5000)
    } catch (err) { console.error(err) }
    finally { setResolving(null) }
  }

  if (!resultsData) {
    return (
      <div className="card text-center py-20">
        <AlertTriangle className="w-10 h-10 text-border mx-auto mb-3" />
        <p className="text-secondary text-sm">Run the pipeline to see exceptions</p>
      </div>
    )
  }

  const orphans = exceptions.filter((e) => e.issues?.some((i) => i.includes('Orphan')))
  const missing = exceptions.filter((e) => e.issues?.some((i) => i.includes('Missing')))
  const format = exceptions.filter((e) => e.issues?.some((i) => i.includes('Non-numeric') || i.includes('Invalid')))

  const SUMMARY_CARDS = [
    { label: 'Total Exceptions', count: exceptions.length, sub: 'Unique flagged records', cardCls: 'bg-sidebar border-border', numCls: 'text-primary', labelCls: 'text-primary', subCls: 'text-secondary' },
    { label: 'Orphan References', count: orphans.length, sub: 'FK not found in parent', cardCls: 'bg-red-50 border-red-200', numCls: 'text-red-700', labelCls: 'text-red-800', subCls: 'text-red-400' },
    { label: 'Missing Required', count: missing.length, sub: 'Required SF fields empty', cardCls: 'bg-amber-50 border-amber-200', numCls: 'text-amber-700', labelCls: 'text-amber-800', subCls: 'text-amber-400' },
    { label: 'Format Issues', count: format.length, sub: 'Invalid amount, stage, date', cardCls: 'bg-[rgba(90,106,207,0.07)] border-[rgba(90,106,207,0.2)]', numCls: 'text-accent', labelCls: 'text-accent', subCls: 'text-secondary' },
  ]

  return (
    <div className="space-y-6">
      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-sm text-emerald-700 font-medium">{toast}</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {SUMMARY_CARDS.map(s => (
          <div key={s.label} className={`card ${s.cardCls} text-center`}>
            <p className={`text-xl font-bold ${s.numCls}`}>{s.count}</p>
            <p className={`text-xs ${s.labelCls} font-medium`}>{s.label}</p>
            <p className={`text-xs ${s.subCls} mt-0.5`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {resolvedKeys.size > 0 && (
        <div className="flex items-center justify-between bg-[rgba(90,106,207,0.07)] border border-[rgba(90,106,207,0.2)] rounded-lg p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm font-semibold text-primary">{resolvedKeys.size} fix{resolvedKeys.size !== 1 ? 'es' : ''} applied</p>
              <p className="text-xs text-secondary">Re-run the pipeline to validate fixes and refresh exception list</p>
            </div>
          </div>
          <button
            onClick={async () => {
              setRerunning(true)
              try {
                await onRerun()
                setResolvedKeys(new Set())
                setFixValues({})
                setToast('Pipeline rerun complete — exceptions refreshed')
                setTimeout(() => setToast(null), 5000)
              } catch (err) { console.error(err) }
              finally { setRerunning(false) }
            }}
            disabled={rerunning}
            className={`btn text-sm py-2 px-5 flex items-center gap-2 rounded-lg font-semibold transition-all ${
              rerunning ? 'bg-border text-secondary' : 'bg-accent text-white hover:bg-[#4a58b8] shadow-sm'
            }`}
          >
            {rerunning
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Re-running...</>
              : <><Play className="w-4 h-4" /> Rerun Pipeline</>
            }
          </button>
        </div>
      )}

      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-lg p-4">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-sm text-secondary">Fix the specific fields shown for each exception. Only the problematic field is exposed — enter the correct value and click <strong className="text-primary">Apply Fix</strong>. After fixing, click <strong className="text-primary">Rerun Pipeline</strong> to validate.</p>
      </div>

      {exceptions.length === 0 ? (
        <div className="card text-center py-16">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-secondary font-medium text-sm">No exceptions — all records passed validation.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exceptions.slice(0, 30).map((exc, idx) => {
            const k = key(exc, idx)
            const done = exc.resolved || resolvedKeys.has(k)
            const issueFields = parseIssueFields(exc.issues || [])
            const fixes = fixValues[k] || {}

            return (
              <div key={k} className={`card transition-all ${done ? 'border-l-4 border-l-emerald-400 bg-emerald-50/30' : 'border-l-4 border-l-amber-400'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono bg-sidebar text-primary px-2 py-0.5 rounded font-semibold border border-border">Row {exc.row_index}</span>
                    {issueFields.map((f, i) => {
                      const s = TYPE_STYLE[f.type] || TYPE_STYLE.other
                      return <span key={i} className={`text-xs ring-1 ring-inset px-2 py-0.5 rounded ${s.badge}`}>{s.label}: {f.field || '?'}</span>
                    })}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${done ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                    {done ? '✓ Fixed' : 'Open'}
                  </span>
                </div>

                <div className="bg-sidebar rounded-lg p-3 mb-3 border border-border">
                  <p className="text-xs font-semibold text-secondary uppercase mb-1.5">Record Data</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
                    {exc.source_data && Object.entries(exc.source_data).map(([field, value]) => {
                      const isIssue = issueFields.some(f => f.field === field)
                      return (
                        <div key={field} className="text-xs">
                          <span className={isIssue ? 'font-bold text-red-600' : 'text-secondary'}>{field}: </span>
                          <span className={isIssue ? 'font-bold text-red-700 bg-red-50 px-1 rounded' : 'text-primary'}>
                            {value !== undefined && value !== null && String(value).trim() ? String(value) : <span className="italic text-red-400">(empty)</span>}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {!done && (
                  <div className="bg-[rgba(90,106,207,0.07)] border border-[rgba(90,106,207,0.15)] rounded-lg p-4">
                    <p className="text-xs font-semibold text-accent uppercase mb-2.5">Fix Required Fields</p>
                    <div className="space-y-2.5">
                      {issueFields.filter(f => f.field).map((f, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-28 shrink-0">
                            <p className="text-xs font-semibold text-primary">{f.field}</p>
                            <p className="text-xs text-secondary">{f.message}</p>
                          </div>
                          <input
                            type="text"
                            value={fixes[f.field] || ''}
                            onChange={e => setFix(k, f.field, e.target.value)}
                            className="input text-sm flex-1 border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent"
                            placeholder={
                              f.type === 'orphan' ? `Valid ${f.field} (e.g. ACC-1000)` :
                              f.type === 'missing_fk' ? `Valid ${f.field}` :
                              `Enter ${f.field}`
                            }
                          />
                          {f.type === 'orphan' && exc.source_data?.[f.field] && (
                            <span className="text-xs text-red-500 shrink-0">
                              Current: <code className="bg-red-50 px-1 rounded">{exc.source_data[f.field]}</code>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-secondary">Fill all fields, then apply</p>
                      <button
                        onClick={() => handleFix(exc, idx)}
                        disabled={resolving === k || issueFields.filter(f => f.field).some(f => !fixes[f.field])}
                        className={`text-xs py-1.5 px-4 rounded-lg flex items-center gap-1 font-semibold transition-all ${
                          resolving === k ? 'bg-border text-secondary' :
                          issueFields.filter(f => f.field).some(f => !fixes[f.field])
                            ? 'bg-sidebar text-secondary cursor-not-allowed border border-border'
                            : 'bg-accent text-white hover:bg-[#4a58b8]'
                        }`}
                      >
                        {resolving === k
                          ? <><Loader2 className="w-3 h-3 animate-spin" /> Applying...</>
                          : <><CheckCircle2 className="w-3 h-3" /> Apply Fix</>
                        }
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
