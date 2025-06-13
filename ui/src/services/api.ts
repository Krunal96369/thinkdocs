import axios, { AxiosError, AxiosResponse } from 'axios'
import toast from 'react-hot-toast'

// Create axios instance
export const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production'
    ? 'https://your-domain.com/api'
    : 'http://localhost:8000/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config.data)
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
    }

    return response
  },
  (error: AxiosError) => {
    // Log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error)
    }

    // Handle specific error cases
    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('authToken')
          delete api.defaults.headers.common['Authorization']
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
            toast.error('Session expired. Please log in again.')
          }
          break

        case 403:
          toast.error('Access denied. You do not have permission to perform this action.')
          break

        case 404:
          toast.error('Resource not found.')
          break

        case 422:
          // Validation errors
          if (data && data.detail) {
            if (Array.isArray(data.detail)) {
              data.detail.forEach((err: any) => {
                toast.error(`${err.loc?.[1] || 'Field'}: ${err.msg}`)
              })
            } else {
              toast.error(data.detail)
            }
          }
          break

        case 429:
          toast.error('Too many requests. Please wait a moment before trying again.')
          break

        case 500:
          toast.error('Server error. Please try again later.')
          break

        default:
          const message = data?.message || data?.detail || 'An unexpected error occurred'
          toast.error(message)
      }
    } else if (error.request) {
      // Network error
      toast.error('Network error. Please check your connection.')
    } else {
      // Other error
      toast.error('An unexpected error occurred.')
    }

    return Promise.reject(error)
  }
)

// API endpoints with typed responses
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),

  logout: () =>
    api.post('/auth/logout'),

  me: () =>
    api.get('/auth/me'),

  refresh: () =>
    api.post('/auth/refresh'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
}

export const documentsAPI = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/documents', { params }),
  getById: (id: string) => api.get(`/documents/${id}`),
  upload: (file: File, metadata: any) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', metadata.title || file.name)
    formData.append('tags', JSON.stringify(metadata.tags || []))

    return api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  delete: (id: string) => api.delete(`/documents/${id}`),
  search: (query: string) => api.post('/documents/search', { query }),
  getContent: (id: string, page?: number) => {
    const params = page ? { page } : {}
    return api.get(`/documents/${id}/content`, { params })
  },
  getChunks: (id: string, page?: number, limit?: number) => {
    const params: any = {}
    if (page) params.page = page
    if (limit) params.limit = limit
    return api.get(`/documents/${id}/chunks`, { params })
  },
}

export const chatAPI = {
  getSessions: () =>
    api.get('/chat/sessions'),

  getSession: (id: string) =>
    api.get(`/chat/sessions/${id}`),

  createSession: (title?: string) =>
    api.post('/chat/sessions', { title }),

  deleteSession: (id: string) =>
    api.delete(`/chat/sessions/${id}`),

  getMessages: (sessionId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/chat/sessions/${sessionId}/messages`, { params }),

  sendMessage: (sessionId: string, message: string, documentIds?: string[]) =>
    api.post(`/chat/sessions/${sessionId}/messages`, {
      message,
      document_ids: documentIds,
    }),

  regenerateResponse: (sessionId: string, messageId: string) =>
    api.post(`/chat/sessions/${sessionId}/messages/${messageId}/regenerate`),
}

export const analyticsAPI = {
  getDashboardStats: () =>
    api.get('/analytics/dashboard'),

  getUsageStats: (period: 'day' | 'week' | 'month' = 'week') =>
    api.get('/analytics/usage', { params: { period } }),

  getDocumentStats: () =>
    api.get('/analytics/documents'),

  getChatStats: () =>
    api.get('/analytics/chat'),
}

export const settingsAPI = {
  getProfile: () =>
    api.get('/settings/profile'),

  updateProfile: (data: any) =>
    api.patch('/settings/profile', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/settings/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),

  getPreferences: () =>
    api.get('/settings/preferences'),

  updatePreferences: (preferences: any) =>
    api.patch('/settings/preferences', preferences),

  exportData: () =>
    api.get('/settings/export-data', { responseType: 'blob' }),

  deleteAccount: (password: string) =>
    api.delete('/settings/account', { data: { password } }),
}

// Utility functions
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  if (error.response?.data?.detail) {
    return typeof error.response.data.detail === 'string'
      ? error.response.data.detail
      : 'Validation error'
  }
  if (error.message) {
    return error.message
  }
  return 'An unexpected error occurred'
}

export const downloadFile = async (url: string, filename: string) => {
  try {
    const response = await api.get(url, { responseType: 'blob' })
    const blob = new Blob([response.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    console.error('Download failed:', error)
    toast.error('Download failed')
  }
}

export default api
