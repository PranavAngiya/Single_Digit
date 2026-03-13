import { useNavigate } from 'react-router-dom'

export default function PortalPage() {
  const navigate = useNavigate()

  const cardStyle = {
    background: '#fff',
    border: '1px solid #e8eaed',
    borderRadius: 12,
    padding: '28px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'box-shadow 0.2s, border-color 0.2s',
  }

  const onEnter = (e) => {
    e.currentTarget.style.boxShadow = '0 4px 20px rgba(39,50,64,0.1)'
    e.currentTarget.style.borderColor = '#5a6acf'
  }
  const onLeave = (e) => {
    e.currentTarget.style.boxShadow = 'none'
    e.currentTarget.style.borderColor = '#e8eaed'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f2f7', fontFamily: "'Poppins', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Top nav */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e8eaed', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#5a6acf', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#273240' }}>AI Demo Platform</span>
        </div>
        <div style={{ width: 1, height: 20, background: '#e8eaed', margin: '0 4px' }} />
        <span style={{ fontSize: 13, color: '#737b8b' }}>Demo Portal</span>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#273240', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 10 }}>Select a Demo to Launch</h1>
          <p style={{ fontSize: 14, color: '#737b8b' }}>Click any card below to open the corresponding application.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, width: '100%', maxWidth: 960 }}>

          {/* Card 1: AI ETL Pipeline */}
          <div style={cardStyle} onClick={() => navigate('/pipeline')} onMouseEnter={onEnter} onMouseLeave={onLeave}>
            <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(90,106,207,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#5a6acf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5a6acf' }}>Module 1</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#273240', lineHeight: 1.3 }}>AI ETL Pipeline for CRM Integration</span>
              <span style={{ fontSize: 13, color: '#737b8b', lineHeight: 1.55 }}>End-to-end data pipeline that transforms, enriches, and loads CRM records with AI-assisted classification and validation.</span>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#5a6acf', marginTop: 'auto', paddingTop: 4 }}>
              Open app
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          </div>

          {/* Card 2: OCR */}
          <div style={cardStyle} onClick={() => navigate('/ocr')} onMouseEnter={onEnter} onMouseLeave={onLeave}>
            <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(90,106,207,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#5a6acf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5a6acf' }}>Module 2</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#273240', lineHeight: 1.3 }}>Understanding of Financial Documents</span>
              <span style={{ fontSize: 13, color: '#737b8b', lineHeight: 1.55 }}>Agentic OCR pipeline that ingests insurance plan PDFs and extracts structured golden-record JSON via multi-agent validation.</span>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#5a6acf', marginTop: 'auto', paddingTop: 4 }}>
              Open app
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          </div>

          {/* Card 3: Voice Agent */}
          <div style={cardStyle} onClick={() => navigate('/helpdesk/login')} onMouseEnter={onEnter} onMouseLeave={onLeave}>
            <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(90,106,207,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#5a6acf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5a6acf' }}>Module 3</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#273240', lineHeight: 1.3 }}>Service Desk Voice Agent</span>
              <span style={{ fontSize: 13, color: '#737b8b', lineHeight: 1.55 }}>AI-powered helpdesk with ElevenLabs voice, real-time ticket management, knowledge base RAG, and live call monitoring.</span>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#5a6acf', marginTop: 'auto', paddingTop: 4 }}>
              Open app
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '20px 24px', fontSize: 12, color: '#737b8b', borderTop: '1px solid #e8eaed', background: '#fff' }}>
        AI Demo Platform &mdash; Internal use only
      </footer>

    </div>
  )
}
