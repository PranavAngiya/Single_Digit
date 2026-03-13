import axios from 'axios'

const api = axios.create({
  baseURL: '/api/pipeline',
  timeout: 120000,
})

export async function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function uploadMultiFiles(files) {
  const formData = new FormData()
  for (const [type, file] of Object.entries(files)) {
    if (file) formData.append(type, file)
  }
  const res = await api.post('/upload-multi', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function uploadMultiAuto(files) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }
  const res = await api.post('/upload-multi-auto', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function getBackendState() {
  const res = await api.get('/state')
  return res.data
}

export async function getProfile() {
  const res = await api.get('/profile')
  return res.data
}

export async function generateMapping() {
  const res = await api.post('/map')
  return res.data
}

export async function updateMapping(mappingSpec) {
  const res = await api.put('/map', mappingSpec)
  return res.data
}

export async function runTransform() {
  const res = await api.post('/transform')
  return res.data
}

export async function analyzeColumns() {
  const res = await api.get('/analyze-columns')
  return res.data
}

export async function getTransformReport() {
  const res = await api.get('/transform-report')
  return res.data
}

export async function getResults(revealPii = false) {
  const res = await api.get('/results', { params: { reveal_pii: revealPii } })
  return res.data
}

export async function resolveException(rowIndex, field, newValue) {
  const res = await api.post('/resolve', {
    row_index: rowIndex,
    field: field,
    new_value: newValue,
  })
  return res.data
}

export async function rerunPipeline() {
  const res = await api.post('/rerun')
  return res.data
}

export async function classifyFiles(files) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }
  const res = await api.post('/classify-files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function previewRawData() {
  const res = await api.get('/profile')
  return res.data
}

export async function previewBeforeAfter() {
  const res = await api.get('/preview-before-after')
  return res.data
}

export async function resetPipeline() {
  const res = await api.delete('/reset')
  return res.data
}

export function getDownloadUrl(filename) {
  return `/api/pipeline/download/${filename}`
}

export async function downloadFile(filename, label) {
  const url = getDownloadUrl(filename)
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || res.statusText)
  }
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
}
