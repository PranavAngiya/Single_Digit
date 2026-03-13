import { useState } from 'react'
import {
  Upload, FileText, CheckCircle2, Database, Zap, Shield,
  Eye, Loader2, X, Sparkles,
} from 'lucide-react'
import { previewRawData, classifyFiles } from '../../lib/pipelineApi'

const CLASSIFY_KEYWORDS = {
  accounts: { keywords: ['account', 'acct', 'company', 'org'], label: 'Accounts', icon: '🏢' },
  contacts: { keywords: ['contact', 'person', 'people'], label: 'Contacts', icon: '👤' },
  leads: { keywords: ['lead', 'prospect'], label: 'Leads', icon: '🎯' },
  opportunities: { keywords: ['opportunit', 'deal', 'pipeline', 'opp'], label: 'Opportunities', icon: '💰' },
}

const TYPE_META = {
  accounts: { label: 'Accounts', icon: '🏢' },
  contacts: { label: 'Contacts', icon: '👤' },
  leads: { label: 'Leads', icon: '🎯' },
  opportunities: { label: 'Opportunities', icon: '💰' },
}

function classifyFileByName(filename) {
  const name = filename.toLowerCase().replace('.csv', '').replace(/-/g, '_').replace(/ /g, '_')
  for (const [type, cfg] of Object.entries(CLASSIFY_KEYWORDS)) {
    if (cfg.keywords.some(kw => name.includes(kw))) return type
  }
  return null
}

export default function UploadView({ onUpload, onMultiUpload, onMultiAutoUpload, uploadData, profileData }) {
  const [dragActive, setDragActive] = useState(false)
  const [mode, setMode] = useState('single')
  const [multiFiles, setMultiFiles] = useState([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewTab, setPreviewTab] = useState('')
  const [smartClassification, setSmartClassification] = useState({})
  const [classifyLoading, setClassifyLoading] = useState(false)

  const handlePreview = async () => {
    setPreviewLoading(true)
    try {
      const data = await previewRawData()
      setPreviewData(data)
      if (data.upload_mode === 'multi' && data.files) {
        setPreviewTab(Object.keys(data.files)[0] || '')
      }
      setPreviewOpen(true)
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Preview failed')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragActive(false)
    if (mode === 'single') {
      const file = e.dataTransfer.files[0]
      if (file?.name.endsWith('.csv')) onUpload(file)
    } else {
      const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'))
      if (files.length) setMultiFiles(prev => [...prev, ...files])
    }
  }

  const handleMultiFileSelect = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.name.endsWith('.csv'))
    if (files.length) setMultiFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  const removeMultiFile = (idx) => {
    setMultiFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSmartClassify = async () => {
    setClassifyLoading(true)
    try {
      const data = await classifyFiles(multiFiles)
      const results = {}
      for (const item of data.classifications) {
        results[item.filename] = { type: item.classified_as, method: item.method }
      }
      setSmartClassification(results)
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Classification failed')
    } finally {
      setClassifyLoading(false)
    }
  }

  const classifiedFiles = multiFiles.map(f => {
    const nameType = classifyFileByName(f.name)
    if (nameType) return { file: f, type: nameType, method: 'filename' }
    const smart = smartClassification[f.name]
    if (smart?.type) return { file: f, type: smart.type, method: smart.method || 'ai' }
    return { file: f, type: null, method: null }
  })

  const hasUnclassified = classifiedFiles.some(f => !f.type)

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 p-1 bg-sidebar rounded-lg w-fit border border-border">
        <button
          onClick={() => setMode('single')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            mode === 'single' ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-primary'
          }`}
        >Single File</button>
        <button
          onClick={() => setMode('multi')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            mode === 'multi' ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-primary'
          }`}
        >Multiple Files</button>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`card border-2 border-dashed text-center py-16 cursor-pointer transition-all ${
          dragActive ? 'border-accent bg-[rgba(90,106,207,0.06)]' : 'border-border hover:border-accent hover:bg-sidebar'
        }`}
      >
        {mode === 'single' ? (
          <>
            <input type="file" accept=".csv" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }} className="hidden" id="csv-upload" />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-[rgba(90,106,207,0.1)] rounded-xl flex items-center justify-center">
                  <Upload className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-base font-semibold text-primary">Drop your CSV file here</p>
                  <p className="text-sm text-secondary mt-1">or click to browse — single file with all CRM data</p>
                </div>
                <div className="flex items-center gap-5 text-xs text-secondary mt-1">
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> CSV format</span>
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> 200–500 rows</span>
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> PII auto-masked</span>
                </div>
              </div>
            </label>
          </>
        ) : (
          <>
            <input type="file" accept=".csv" multiple onChange={handleMultiFileSelect} className="hidden" id="csv-multi-upload" />
            <label htmlFor="csv-multi-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-[rgba(90,106,207,0.1)] rounded-xl flex items-center justify-center">
                  <Upload className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-base font-semibold text-primary">Drop all CSV files here</p>
                  <p className="text-sm text-secondary mt-1">or click to browse — accounts, contacts, leads &amp; opportunities</p>
                </div>
                <div className="flex items-center gap-5 text-xs text-secondary mt-1">
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Up to 4 CSVs</span>
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Auto-classified</span>
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> PII auto-masked</span>
                </div>
              </div>
            </label>
          </>
        )}
      </div>

      {/* Multi-File Classification Preview */}
      {mode === 'multi' && multiFiles.length > 0 && (
        <div className="card animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Database className="w-4 h-4 text-accent" /> File Classification
            </h3>
            <span className="text-xs text-secondary">{classifiedFiles.filter(f => f.type).length} of {multiFiles.length} classified</span>
          </div>

          <div className="space-y-2 mb-4">
            {classifiedFiles.map((cf, idx) => {
              const meta = cf.type ? TYPE_META[cf.type] : null
              const methodLabel = cf.method === 'filename' ? 'by name' : cf.method === 'columns' ? 'by columns' : cf.method === 'llm' ? 'by AI' : null
              return (
                <div key={idx} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                  cf.type ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{meta?.icon || '❓'}</span>
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {cf.file.name}
                        {methodLabel && cf.method !== 'filename' && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                            <Sparkles className="w-3 h-3" />{methodLabel}
                          </span>
                        )}
                      </p>
                      <p className={`text-xs font-semibold ${cf.type ? 'text-emerald-600' : 'text-red-500'}`}>
                        {cf.type ? `→ ${meta?.label}` : 'Unrecognized — try Smart Classify or rename file'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => removeMultiFile(idx)} className="text-secondary hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-xs text-secondary">Files classified by name, columns &amp; AI</p>
              {hasUnclassified && (
                <button
                  onClick={handleSmartClassify}
                  disabled={classifyLoading}
                  className="btn-secondary text-xs py-1 px-3 flex items-center gap-1"
                >
                  {classifyLoading
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
                    : <><Sparkles className="w-3.5 h-3.5" /> Smart Classify</>}
                </button>
              )}
            </div>
            <button
              onClick={() => onMultiAutoUpload(multiFiles)}
              disabled={classifiedFiles.filter(f => f.type).length === 0}
              className="btn-primary flex items-center gap-1"
            >
              <Upload className="w-4 h-4" /> Upload {multiFiles.length} File{multiFiles.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* Upload Result */}
      {uploadData && (
        <div className="card bg-emerald-50/40 border-emerald-200 animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-semibold text-emerald-700">Upload Successful</h3>
              <span className="badge-blue text-xs">{uploadData.upload_mode === 'multi' ? 'Multi-File' : 'Unified'}</span>
            </div>
            <button
              onClick={handlePreview}
              disabled={previewLoading}
              className="flex items-center gap-2 bg-accent text-white hover:bg-[#4a58b8] px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm"
            >
              {previewLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                : <><Eye className="w-4 h-4" /> Preview Raw Data</>
              }
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3 border-b border-emerald-200 pb-5">
            <div className="bg-white rounded-lg p-3 border border-border">
              <MetricCard label="File(s)" value={uploadData.upload_mode === 'multi' ? `${Object.keys(uploadData.files || {}).length} files` : uploadData.file_name} />
            </div>
            <div className="bg-white rounded-lg p-3 border border-border">
              <MetricCard label="Total Rows" value={uploadData.row_count} />
            </div>
            <div className="bg-white rounded-lg p-3 border border-border">
              <MetricCard label="Unique Columns" value={uploadData.column_count} />
            </div>
            <div className="bg-white rounded-lg p-3 border border-border">
              <MetricCard label="Upload ID" value={uploadData.upload_id} small />
            </div>
          </div>
          {uploadData.files && (
            <div className="mt-5 grid grid-cols-4 gap-3">
              {Object.entries(uploadData.files).map(([type, info]) => (
                <div key={type} className="bg-white rounded-lg p-3 border border-border">
                  <p className="text-xs text-secondary uppercase font-semibold">{type}</p>
                  <p className="text-lg font-bold text-primary">{info.row_count} <span className="text-xs font-normal text-secondary">rows</span></p>
                  <p className="text-xs text-secondary">{info.columns?.length} columns</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Profile Data */}
      {profileData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <div className="card">
            <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-accent" /> Column Profile
              {profileData.upload_mode === 'multi' && <span className="badge-blue text-xs">Multi-File</span>}
            </h3>
            {profileData.file_profiles ? (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-3">
                {Object.entries(profileData.file_profiles).map(([ft, fp]) => (
                  <div key={ft}>
                    <p className="text-xs font-semibold text-secondary uppercase mb-1.5">{ft} ({fp.row_count} rows)</p>
                    <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
                      <thead><tr className="text-xs text-secondary uppercase border-b border-border">
                        <th className="pb-1 pr-3 text-left">Column</th><th className="pb-1 pr-3 text-right">Non-Null</th><th className="pb-1 pr-3 text-right">Null</th><th className="pb-1 text-right">Unique</th>
                      </tr></thead>
                      <tbody>
                        {fp.columns?.map((c) => (
                          <tr key={`${ft}-${c.column_name}`} className="border-b border-border">
                            <td className="py-1 pr-3 font-medium text-primary">{c.column_name}</td>
                            <td className="py-1 pr-3 text-right tabular-nums text-emerald-600">{c.non_null_count}</td>
                            <td className="py-1 pr-3 text-right tabular-nums text-red-500">{c.null_count}</td>
                            <td className="py-1 text-right tabular-nums text-accent">{c.unique_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <thead><tr className="text-xs text-secondary uppercase border-b border-border">
                  <th className="pb-2 pr-4 text-left">Column</th><th className="pb-2 pr-4 text-right">Non-Null</th><th className="pb-2 pr-4 text-right">Null</th><th className="pb-2 text-right">Unique</th>
                </tr></thead>
                <tbody>
                  {profileData.profile?.columns?.map((c) => (
                    <tr key={c.column_name} className="border-b border-border">
                      <td className="py-2 pr-4 font-medium text-primary">{c.column_name}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-emerald-600">{c.non_null_count}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-red-500">{c.null_count}</td>
                      <td className="py-2 text-right tabular-nums text-accent">{c.unique_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" /> Data Quality Summary
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <MetricCard label="Total Records" value={profileData.dq_report?.total_records} />
              <MetricCard label="Clean Records" value={profileData.dq_report?.clean_records} color="emerald" />
              <MetricCard label="Exceptions" value={profileData.dq_report?.exception_records} color="red" />
            </div>
            {profileData.dq_report?.summary && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-secondary uppercase">Issue Breakdown</p>
                {Object.entries(profileData.dq_report.summary).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                    <span className="text-secondary">{type.replace(/_/g, ' ')}</span>
                    <span className="badge-amber">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raw Data Preview Modal */}
      {previewOpen && previewData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                  <Eye className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-primary">Raw Data Preview (Before Transformation)</h3>
                  <p className="text-xs text-secondary">Showing uploaded CSV data as-is — up to 50 rows</p>
                </div>
              </div>
              <button onClick={() => setPreviewOpen(false)} className="text-secondary hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewData.upload_mode === 'multi' && previewData.files && (
              <div className="flex items-center gap-1 px-6 pt-3 pb-0 shrink-0">
                {Object.entries(previewData.files).map(([fileType, info]) => (
                  <button
                    key={fileType}
                    onClick={() => setPreviewTab(fileType)}
                    className={`px-4 py-1.5 rounded-t-lg text-xs font-semibold transition-all border border-b-0 ${
                      previewTab === fileType
                        ? 'bg-white text-accent border-border'
                        : 'bg-sidebar text-secondary border-transparent hover:text-primary'
                    }`}
                  >
                    {fileType.charAt(0).toUpperCase() + fileType.slice(1)} ({info.row_count})
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-auto">
              {(() => {
                const src = previewData.upload_mode === 'multi' && previewData.files
                  ? previewData.files[previewTab]
                  : previewData
                if (!src) return <p className="text-sm text-neutral-400 px-6 py-4">No data</p>
                return (
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="text-left text-xs text-secondary uppercase border-b border-border bg-sidebar">
                        <th className="px-3 py-2 whitespace-nowrap font-semibold">#</th>
                        {src.columns?.map((col) => (
                          <th key={col} className="px-3 py-2 whitespace-nowrap font-semibold">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {src.preview?.map((row, idx) => (
                        <tr key={idx} className="border-b border-border hover:bg-sidebar transition-colors">
                          <td className="px-3 py-1.5 text-neutral-400 font-mono text-xs">{idx + 1}</td>
                          {src.columns?.map((col) => (
                            <td key={col} className="px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate text-secondary">
                              {String(row[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              })()}
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-border shrink-0">
              <p className="text-xs text-secondary">
                {previewData.upload_mode === 'multi' && previewData.files
                  ? `${previewData.files[previewTab]?.row_count || 0} rows · ${previewData.files[previewTab]?.columns?.length || 0} columns`
                  : `${previewData.row_count || 0} rows · ${previewData.columns?.length || 0} columns`
                }
              </p>
              <button onClick={() => setPreviewOpen(false)} className="text-sm font-medium text-secondary hover:text-primary transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, color, small }) {
  const c = color === 'emerald' ? 'text-emerald-600' : color === 'red' ? 'text-red-500' : color === 'blue' ? 'text-accent' : 'text-primary'
  return (
    <div>
      <p className="text-xs text-secondary uppercase font-semibold">{label}</p>
      <p className={`${small ? 'text-sm' : 'text-lg'} font-bold ${c} mt-0.5 truncate`}>{value ?? '—'}</p>
    </div>
  )
}
