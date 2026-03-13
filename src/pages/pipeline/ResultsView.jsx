import { useState, useEffect } from 'react'
import { BarChart3, Download, RefreshCw, FileText, Loader2, Eye } from 'lucide-react'
import { previewBeforeAfter, downloadFile } from '../../lib/pipelineApi'

const OBJECT_TABS = [
  { key: 'accounts', label: 'Accounts' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'leads', label: 'Leads' },
  { key: 'opportunities', label: 'Opportunities' },
]

export default function ResultsView({ resultsData, revealPii, onRefresh }) {
  const [activeOutput, setActiveOutput] = useState('sf_accounts')
  const [compareObject, setCompareObject] = useState('accounts')
  const [compareTab, setCompareTab] = useState('before')
  const [compareData, setCompareData] = useState(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [downloadingFile, setDownloadingFile] = useState(null)

  useEffect(() => {
    if (resultsData) {
      setCompareLoading(true)
      previewBeforeAfter()
        .then(setCompareData)
        .catch(() => {})
        .finally(() => setCompareLoading(false))
    }
  }, [resultsData])

  const handleArtifactDownload = async (filename, label) => {
    setDownloadingFile(filename)
    try {
      await downloadFile(filename, label)
    } catch (err) {
      alert(`Download failed: ${err.message}`)
    } finally {
      setDownloadingFile(null)
    }
  }

  if (!resultsData) {
    return (
      <div className="card text-center py-20">
        <BarChart3 className="w-10 h-10 text-border mx-auto mb-3" />
        <p className="text-secondary text-sm">Run the pipeline to see results</p>
      </div>
    )
  }

  // Normalize outputs: backend returns { sf_accounts: [...records], ... }
  // Normalize to { sf_accounts: { row_count, columns, preview } }
  const rawOutputs = resultsData.outputs || {}
  const outputs = Object.fromEntries(
    Object.entries(rawOutputs).map(([key, val]) => {
      if (Array.isArray(val)) {
        const cols = val.length > 0 ? Object.keys(val[0]) : []
        return [key, { row_count: val.length, columns: cols, preview: val }]
      }
      return [key, val]
    })
  )
  const current = outputs[activeOutput]
  const currentCompare = compareData?.[compareObject]
  const compareSource = currentCompare?.[compareTab]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary">Transformed Salesforce-ready data.</p>
        <button onClick={onRefresh} className="btn-secondary text-xs flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(outputs).map(([name, data]) => (
          <button
            key={name}
            onClick={() => setActiveOutput(name)}
            className={`card text-left transition-all ${
              activeOutput === name ? 'ring-2 ring-accent border-accent/30' : 'hover:shadow-md'
            }`}
          >
            <p className="text-xs text-secondary uppercase font-semibold truncate">{name.replace('sf_', '')}</p>
            <p className="text-2xl font-bold text-primary mt-1">{data.row_count}</p>
            <p className="text-xs text-secondary">records</p>
          </button>
        ))}
        <div className="card bg-amber-50 border-amber-200">
          <p className="text-xs text-amber-700 uppercase font-semibold">Exceptions</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{resultsData.exceptions_count || 0}</p>
          <p className="text-xs text-amber-500">flagged</p>
        </div>
      </div>

      {/* Data preview */}
      {current && (
        <div className="card-flush animate-fade-in">
          <div className="px-5 py-3 bg-sidebar border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary">{activeOutput.replace('sf_', 'SF ')} Preview</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-secondary">{current.row_count} rows</span>
              <button
                onClick={() => handleArtifactDownload(`${activeOutput}.csv`, `${activeOutput}.csv`)}
                disabled={downloadingFile === `${activeOutput}.csv`}
                className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
              >
                {downloadingFile === `${activeOutput}.csv`
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Download className="w-3 h-3" />} CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-xs text-secondary uppercase border-b border-border bg-sidebar">
                  {current.columns?.map((col) => (
                    <th key={col} className="px-4 py-2 whitespace-nowrap font-semibold">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {current.preview?.slice(0, 15).map((row, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-sidebar transition-colors">
                    {current.columns?.map((col) => (
                      <td key={col} className="px-4 py-2 whitespace-nowrap max-w-[200px] truncate text-secondary">
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Before / After Comparison */}
      <div className="card-flush animate-fade-in">
        <div className="px-5 py-3 bg-sidebar border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Eye className="w-4 h-4 text-accent" /> Before / After Transformation
            </h3>
            {compareLoading && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
          </div>
          <div className="flex items-center gap-2">
            {OBJECT_TABS.map(obj => {
              const afterCount = compareData?.[obj.key]?.after?.row_count
              return (
                <button
                  key={obj.key}
                  onClick={() => { setCompareObject(obj.key); setCompareTab('before') }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    compareObject === obj.key
                      ? 'bg-accent text-white shadow-sm'
                      : 'bg-white text-secondary border border-border hover:bg-sidebar'
                  }`}
                >
                  {obj.label} {afterCount != null ? `(${afterCount})` : ''}
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-5 pt-3 pb-0 flex items-center gap-1">
          <button
            onClick={() => setCompareTab('before')}
            className={`px-4 py-1.5 rounded-t-lg text-xs font-semibold transition-all border border-b-0 ${
              compareTab === 'before'
                ? 'bg-white text-accent border-border'
                : 'bg-sidebar text-secondary border-transparent hover:text-primary'
            }`}
          >Before Transformation</button>
          <button
            onClick={() => setCompareTab('after')}
            className={`px-4 py-1.5 rounded-t-lg text-xs font-semibold transition-all border border-b-0 ${
              compareTab === 'after'
                ? 'bg-white text-emerald-700 border-border'
                : 'bg-sidebar text-secondary border-transparent hover:text-primary'
            }`}
          >After Transformation</button>
        </div>

        <div className="overflow-x-auto max-h-[400px] overflow-y-auto relative">
          {compareSource ? (
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-secondary uppercase bg-white border-b border-border">
                  <th className="px-3 py-2 whitespace-nowrap font-semibold bg-white">#</th>
                  {compareSource.columns?.map((col) => (
                    <th key={col} className="px-3 py-2 whitespace-nowrap font-semibold bg-white">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareSource.preview?.map((row, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-sidebar transition-colors">
                    <td className="px-3 py-1.5 text-secondary font-mono text-xs">{idx + 1}</td>
                    {compareSource.columns?.map((col) => (
                      <td key={col} className="px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate text-secondary">
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-secondary">
                {compareLoading ? 'Loading preview...' : 'No data available for this object'}
              </p>
            </div>
          )}
        </div>

        {compareSource && (
          <div className="px-5 py-2 border-t border-border bg-sidebar">
            <p className="text-xs text-secondary">
              {compareSource.row_count} rows · {compareSource.columns?.length} columns · Showing up to 50 rows
            </p>
          </div>
        )}
      </div>

      {/* Download Artifacts */}
      <div className="card">
        <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
          <Download className="w-4 h-4 text-accent" /> Download Artifacts
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {resultsData.download_links && Object.entries(resultsData.download_links)
            .filter(([name]) => name !== 'before_data_pdf' && name !== 'after_data_pdf')
            .map(([name, url]) => {
              const filename = url.split('/').pop() || name
              return (
                <button
                  key={name}
                  onClick={() => handleArtifactDownload(filename, name)}
                  disabled={downloadingFile === filename}
                  className="flex items-center gap-2.5 bg-sidebar hover:bg-border rounded-lg p-3 transition-colors border border-border text-left"
                >
                  {downloadingFile === filename
                    ? <Loader2 className="w-4 h-4 text-accent shrink-0 animate-spin" />
                    : <FileText className="w-4 h-4 text-accent shrink-0" />} {name}
                </button>
              )
            })}
        </div>
      </div>

      {/* Audit trail */}
      {resultsData.audit_log?.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" /> Audit Trail
          </h3>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {resultsData.audit_log.map((entry, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs bg-sidebar rounded-lg p-2.5 border border-border">
                <span className="text-secondary whitespace-nowrap font-mono text-xs">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span className="badge-blue text-xs">{entry.action}</span>
                <span className="text-secondary truncate text-xs">{JSON.stringify(entry.details)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
