import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, GitBranch, Play, BarChart3, AlertTriangle,
  RefreshCw, Shield, Loader2, XCircle, Database, ChevronLeft,
} from 'lucide-react'
import { uploadFile, uploadMultiFiles, uploadMultiAuto, getProfile, generateMapping,
  runTransform, getResults, resolveException, resetPipeline,
  analyzeColumns, getTransformReport, rerunPipeline, getBackendState,
} from '../../lib/pipelineApi'
import UploadView from './UploadView'
import MappingView from './MappingView'
import PipelineView from './PipelineView'
import ResultsView from './ResultsView'
import ExceptionsView from './ExceptionsView'

const INITIAL_STEPS = [
  { id: 'upload', label: 'Upload', icon: Upload, status: 'active' },
  { id: 'mapping', label: 'Schema Mapping', icon: GitBranch, status: 'pending' },
  { id: 'pipeline', label: 'Transform', icon: Play, status: 'pending' },
  { id: 'results', label: 'Results', icon: BarChart3, status: 'pending' },
  { id: 'exceptions', label: 'Exceptions', icon: AlertTriangle, status: 'pending' },
]

export default function PipelinePage() {
  const navigate = useNavigate()
  const [steps, setSteps] = useState(INITIAL_STEPS.map(s => ({ ...s })))
  const [activeTab, setActiveTab] = useState('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [revealPii, setRevealPii] = useState(false)

  const [uploadData, setUploadData] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const [mappingData, setMappingData] = useState(null)
  const [transformData, setTransformData] = useState(null)
  const [transformReport, setTransformReport] = useState(null)
  const [columnAnalysis, setColumnAnalysis] = useState(null)
  const [resultsData, setResultsData] = useState(null)

  const updateStep = (id, status) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  const handleUpload = useCallback(async (file) => {
    setLoading(true); setError(null)
    try {
      const data = await uploadFile(file)
      setUploadData(data)
      updateStep('upload', 'done')
      const profile = await getProfile()
      setProfileData(profile)
      updateStep('mapping', 'active')
      setActiveTab('mapping')
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Upload failed')
      updateStep('upload', 'error')
    } finally { setLoading(false) }
  }, [])

  const handleMultiUpload = useCallback(async (files) => {
    setLoading(true); setError(null)
    try {
      const data = await uploadMultiFiles(files)
      setUploadData(data)
      updateStep('upload', 'done')
      const profile = await getProfile()
      setProfileData(profile)
      updateStep('mapping', 'active')
      setActiveTab('mapping')
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Multi-file upload failed')
      updateStep('upload', 'error')
    } finally { setLoading(false) }
  }, [])

  const handleMultiAutoUpload = useCallback(async (files) => {
    setLoading(true); setError(null)
    try {
      const data = await uploadMultiAuto(files)
      setUploadData(data)
      updateStep('upload', 'done')
      const profile = await getProfile()
      setProfileData(profile)
      updateStep('mapping', 'active')
      setActiveTab('mapping')
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Multi-file upload failed')
      updateStep('upload', 'error')
    } finally { setLoading(false) }
  }, [])

  const checkBackendAlive = useCallback(async () => {
    try {
      const s = await getBackendState()
      if (s.status === 'idle' || !s.upload_id) {
        setError('Backend state was reset. Please re-upload your files.')
        setUploadData(null); setProfileData(null); setMappingData(null)
        setTransformData(null); setTransformReport(null); setColumnAnalysis(null)
        setResultsData(null); setActiveTab('upload')
        setSteps(INITIAL_STEPS.map(s => ({ ...s })))
        return false
      }
      return true
    } catch {
      setError('Cannot reach the backend server. Make sure it is running.')
      return false
    }
  }, [])

  const handleMapping = useCallback(async () => {
    setLoading(true); setError(null)
    if (!(await checkBackendAlive())) { setLoading(false); return }
    try {
      const data = await generateMapping()
      setMappingData(data)
      try { setColumnAnalysis(await analyzeColumns()) } catch (_) {}
      updateStep('mapping', 'done')
      updateStep('pipeline', 'active')
      setActiveTab('pipeline')
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Mapping failed')
      updateStep('mapping', 'error')
    } finally { setLoading(false) }
  }, [checkBackendAlive])

  const handleTransform = useCallback(async () => {
    setLoading(true); setError(null)
    if (!(await checkBackendAlive())) { setLoading(false); return }
    try {
      const data = await runTransform()
      setTransformData(data)
      try { setTransformReport(await getTransformReport()) } catch (_) {}
      updateStep('pipeline', 'done')
      const results = await getResults(revealPii)
      setResultsData(results)
      updateStep('results', 'done')
      updateStep('exceptions', 'done')
      setActiveTab('results')
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Transform failed')
      updateStep('pipeline', 'error')
    } finally { setLoading(false) }
  }, [revealPii, checkBackendAlive])

  const handleReset = useCallback(async () => {
    await resetPipeline()
    setUploadData(null); setProfileData(null); setMappingData(null)
    setTransformData(null); setTransformReport(null); setColumnAnalysis(null)
    setResultsData(null); setError(null); setActiveTab('upload')
    setSteps(INITIAL_STEPS.map(s => ({ ...s })))
  }, [])

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    try { setResultsData(await getResults(revealPii)) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [revealPii])

  const handleRerun = useCallback(async () => {
    setLoading(true); setError(null)
    if (!(await checkBackendAlive())) { setLoading(false); return }
    try {
      const data = await rerunPipeline()
      setResultsData(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Rerun failed')
    } finally { setLoading(false) }
  }, [checkBackendAlive])

  useEffect(() => {
    if (resultsData) {
      getResults(revealPii).then(setResultsData).catch(() => {})
    }
  }, [revealPii]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentStep = steps.find(s => s.id === activeTab)

  return (
    <div className="flex h-screen overflow-hidden bg-sidebar">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-white border-r border-border flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-primary leading-tight">AI ETL Pipeline</h1>
              <p className="text-xs text-secondary leading-tight">CRM → Salesforce</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {steps.map((step, idx) => {
            const isActive = activeTab === step.id
            const isDone = step.status === 'done'
            const isError = step.status === 'error'
            const Icon = step.icon
            return (
              <button
                key={step.id}
                onClick={() => setActiveTab(step.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-accent text-white' :
                  isDone ? 'text-emerald-600 hover:bg-sidebar' :
                  isError ? 'text-red-500 hover:bg-sidebar' :
                  'text-secondary hover:bg-sidebar hover:text-primary'
                }`}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                  isActive ? 'bg-white/20 text-white' :
                  isDone ? 'bg-emerald-50 text-emerald-600' :
                  isError ? 'bg-red-50 text-red-500' :
                  'bg-sidebar text-secondary'
                }`}>
                  {isDone ? '✓' : idx + 1}
                </div>
                <span>{step.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-border space-y-1">
          <button
            onClick={() => setRevealPii(!revealPii)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-secondary hover:bg-sidebar hover:text-primary transition-all"
          >
            <Shield className="w-4 h-4" />
            <span>PII:</span>
            {revealPii
              ? <span className="ml-auto text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-md font-semibold border border-red-200">Revealed</span>
              : <span className="ml-auto text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">Masked</span>
            }
          </button>
          <button
            onClick={handleReset}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-secondary hover:bg-sidebar hover:text-primary transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Pipeline
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-secondary hover:bg-sidebar hover:text-primary transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Portal
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="shrink-0 h-14 bg-white border-b border-border flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            {currentStep && <currentStep.icon className="w-5 h-5 text-accent" />}
            <h2 className="text-base font-semibold text-primary">{currentStep?.label}</h2>
          </div>
          <span className="inline-flex items-center gap-1 bg-sidebar text-secondary px-2.5 py-1 rounded-md text-xs font-medium border border-border">
            Step {steps.findIndex(s => s.id === activeTab) + 1} of {steps.length}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-6">
          {loading && (
            <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center gap-4 border border-border">
                <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
                <p className="text-sm font-medium text-secondary">Processing...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 animate-fade-in">
              <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700">Error</p>
                <p className="text-sm text-red-600 mt-0.5">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="animate-fade-in">
            {activeTab === 'upload' && (
              <UploadView
                onUpload={handleUpload}
                onMultiUpload={handleMultiUpload}
                onMultiAutoUpload={handleMultiAutoUpload}
                uploadData={uploadData}
                profileData={profileData}
              />
            )}
            {activeTab === 'mapping' && (
              <MappingView mappingData={mappingData} onGenerateMapping={handleMapping} />
            )}
            {activeTab === 'pipeline' && (
              <PipelineView
                mappingData={mappingData}
                transformData={transformData}
                transformReport={transformReport}
                columnAnalysis={columnAnalysis}
                onTransform={handleTransform}
              />
            )}
            {activeTab === 'results' && (
              <ResultsView resultsData={resultsData} revealPii={revealPii} onRefresh={handleRefresh} />
            )}
            {activeTab === 'exceptions' && (
              <ExceptionsView resultsData={resultsData} onResolve={resolveException} onRerun={handleRerun} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
