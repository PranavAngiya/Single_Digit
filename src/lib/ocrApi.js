import axios from 'axios'

const api = axios.create({
  baseURL: '/api/ocr',
  timeout: 180000,
})

export async function parsePdf(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post('/parse', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}
