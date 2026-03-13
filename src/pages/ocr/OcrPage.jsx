import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { parsePdf } from '../../lib/ocrApi'

function escapeHtml(s) {
  if (s == null) return ''
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function formatAgentName(agent) {
  if (!agent) return ''
  return agent.replace(/([A-Z])/g, ' $1').trim()
}

export default function OcrPage() {
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [statusType, setStatusType] = useState('') // '' | 'success' | 'error'
  const [lastJson, setLastJson] = useState(null)
  const [lastJsonFilename, setLastJsonFilename] = useState('udm_output.json')
  const inputRef = useRef(null)

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') {
      setFile(f)
      setResult(null)
      setError(null)
      setStatusMsg('')
      setStatusType('')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async () => {
    if (!file) { setStatusMsg('Please choose a PDF first.'); setStatusType(''); return }
    setLoading(true)
    setStatusMsg('Uploading and parsing\u2026')
    setStatusType('')
    setResult(null)
    setLastJson(null)
    try {
      const data = await parsePdf(file)
      setResult(data)
      setLastJson(data)
      setLastJsonFilename((file.name.replace(/\.pdf$/i, '') || 'udm_output') + '.json')
      setStatusMsg('Parsed successfully. You can download the JSON.')
      setStatusType('success')
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Parse failed'
      setStatusMsg('Failed: ' + msg)
      setStatusType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!lastJson) return
    const copy = { ...lastJson }
    delete copy.pipeline_steps
    const blob = new Blob([JSON.stringify(copy, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = lastJsonFilename
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  const udm = result?.udm || {}
  const steps = udm.pipeline_steps || []
  const udmCopy = result ? { ...result, udm: { ...udm } } : null
  if (udmCopy?.udm) delete udmCopy.udm.pipeline_steps
  const jsonText = udmCopy ? JSON.stringify(udmCopy, null, 2) : ''

  const statusStyle = statusType === 'success'
    ? { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '8px 12px', borderRadius: 8, fontWeight: 500, fontSize: 13, marginTop: 12 }
    : statusType === 'error'
    ? { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px 12px', borderRadius: 8, fontWeight: 500, fontSize: 13, marginTop: 12 }
    : { fontSize: 13, color: '#737b8b', minHeight: 20, marginTop: 12 }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f2f7', fontFamily: "'Poppins', sans-serif", display: 'flex', flexDirection: 'column', lineHeight: 1.5 }}>

      {/* Top nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e8eaed', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, background: '#5a6acf', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#273240' }}>AI Demo Platform</span>
        </Link>
        <div style={{ width: 1, height: 20, background: '#e8eaed', margin: '0 4px' }} />
        <span style={{ fontSize: 13, color: '#737b8b' }}>Understanding of Financial Documents</span>
        <Link
          to="/"
          style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: '#5a6acf', textDecoration: 'none', padding: '6px 12px', borderRadius: 8, border: '1px solid #e8eaed', background: '#fff', transition: 'background 0.15s' }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Portal
        </Link>
      </nav>

      {/* Page content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 24px 56px', flex: 1 }}>
        <div style={{ width: '100%', maxWidth: 860 }}>

          {/* Page header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5a6acf', marginBottom: 6 }}>Module 2</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#273240', letterSpacing: '-0.01em', marginBottom: 6 }}>Understanding of Financial Documents</h1>
            <p style={{ fontSize: 13, color: '#737b8b', margin: 0 }}>Upload a PDF &rarr; agents extract and validate &rarr; download structured Golden Record JSON.</p>
          </div>

          {/* Upload & parse card */}
          <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#737b8b', marginBottom: 14 }}>Upload &amp; Parse</div>

            {/* Upload zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragActive ? '#5a6acf' : '#e8eaed'}`,
                borderRadius: 8,
                padding: '28px 24px',
                textAlign: 'center',
                background: dragActive ? 'rgba(90,106,207,0.10)' : '#f1f2f7',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              <input
                ref={inputRef}
                id="pdfInput"
                type="file"
                accept="application/pdf"
                style={{ display: 'block', margin: '0 auto 10px', fontSize: 13, fontFamily: "'Poppins', sans-serif", color: '#737b8b' }}
                onChange={e => handleFile(e.target.files?.[0])}
              />
              <p style={{ fontSize: 12, color: '#737b8b', marginTop: 6 }}>Select a plan document PDF (carrier, HR manual, certificate, etc.)</p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 18 }}>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 13, border: 'none', borderRadius: 8, padding: '9px 18px', cursor: loading ? 'not-allowed' : 'pointer', background: '#5a6acf', color: '#fff', opacity: loading ? 0.45 : 1, transition: 'background 0.15s' }}
              >
                {loading ? 'Parsing…' : 'Parse PDF → JSON'}
              </button>
              <button
                onClick={handleDownload}
                disabled={!lastJson}
                style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 13, border: '1px solid #e8eaed', borderRadius: 8, padding: '9px 18px', cursor: lastJson ? 'pointer' : 'not-allowed', background: '#fff', color: '#273240', opacity: lastJson ? 1 : 0.45, transition: 'background 0.15s' }}
              >
                Download JSON
              </button>
            </div>

            {/* Status */}
            {statusMsg && <div style={statusStyle}>{statusMsg}</div>}

            {/* Pipeline steps */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#737b8b', marginBottom: 14 }}>
                Agents invoked (from <code style={{ fontFamily: 'monospace', fontSize: '0.85em', textTransform: 'none', color: '#5a6acf', background: 'rgba(90,106,207,0.10)', padding: '1px 5px', borderRadius: 4 }}>agents/</code>)
              </div>
              {steps.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#737b8b', fontSize: 13, background: '#f1f2f7', border: '1px dashed #e8eaed', borderRadius: 8 }}>
                  Run a parse to see which agents are invoked: Ingestion &rarr; Router Agent &rarr; Extractor Agent &rarr; Validator Agent.
                </div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {steps.map((step, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                      <span style={{ width: 34, height: 34, borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#15803d', flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#273240', marginBottom: 2 }}>{formatAgentName(step.agent)}</div>
                        {step.module && <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#5a6acf', background: 'rgba(90,106,207,0.10)', display: 'inline-block', padding: '1px 6px', borderRadius: 4, marginBottom: 4 }}>{step.module}</div>}
                        <div style={{ fontSize: 12, color: '#737b8b' }}>{step.detail || step.status || ''}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: 20, flexShrink: 0, alignSelf: 'center' }}>{step.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* JSON output */}
            <div style={{ marginTop: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13, color: '#273240' }}>UDM JSON (preview)</label>
              <textarea
                readOnly
                value={jsonText}
                placeholder="JSON output will appear here after parsing."
                style={{ width: '100%', minHeight: 260, fontFamily: 'monospace', fontSize: 12, padding: 16, borderRadius: 8, border: '1px solid #e8eaed', background: '#fafafa', color: '#273240', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '20px 24px', fontSize: 12, color: '#737b8b', borderTop: '1px solid #e8eaed', background: '#fff' }}>
        AI Demo Platform &mdash; Internal use only
      </footer>

    </div>
  )
}
