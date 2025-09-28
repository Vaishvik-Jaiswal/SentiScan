import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
})

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
      // Redirect to login page
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Article API functions
export const articleAPI = {
  // Upload article
  uploadArticle: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/api/articles/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Create article from text
  createFromText: async (title, content, language) => {
    const response = await api.post('/api/articles/text', {
      title,
      content,
      language,
    })
    return response.data
  },

  // Get user articles
  getUserArticles: async (page = 1, limit = 10) => {
    const response = await api.get(`/api/articles?page=${page}&limit=${limit}`)
    return response.data
  },

  // Get article by ID
  getArticleById: async (id) => {
    const response = await api.get(`/api/articles/${id}`)
    return response.data
  },

  // Delete article
  deleteArticle: async (id) => {
    const response = await api.delete(`/api/articles/${id}`)
    return response.data
  },

  // Get analytics
  getAnalytics: async () => {
    const response = await api.get('/api/articles/analytics')
    return response.data
  },
}

// News Comparison API functions
export const newsComparisonAPI = {
  // Create new comparison
  createComparison: async (comparisonData) => {
    const response = await api.post('/api/news-comparison', comparisonData)
    return response.data
  },

  // Add article to comparison
  addArticle: async (comparisonId, articleData) => {
    const response = await api.post(`/api/news-comparison/${comparisonId}/add-article`, articleData)
    return response.data
  },

  // Start analysis
  startAnalysis: async (comparisonId) => {
    const response = await api.post(`/api/news-comparison/${comparisonId}/analyze`)
    return response.data
  },

  // Get user comparisons
  getUserComparisons: async (page = 1, limit = 10) => {
    const response = await api.get(`/api/news-comparison?page=${page}&limit=${limit}`)
    return response.data
  },

  // Get comparison by ID
  getComparison: async (comparisonId) => {
    const response = await api.get(`/api/news-comparison/${comparisonId}`)
    return response.data
  },

  // Delete comparison
  deleteComparison: async (comparisonId) => {
    const response = await api.delete(`/api/news-comparison/${comparisonId}`)
    return response.data
  },

  // Download PDF report
  downloadPDFReport: async (comparisonId) => {
    const response = await api.get(`/api/news-comparison/${comparisonId}/pdf-report`, {
      responseType: 'blob'
    })
    return response.data
  },

  // Download article as text file
  downloadArticle: async (articleId) => {
    const response = await api.get(`/api/articles/${articleId}/download`, {
      responseType: 'blob'
    })
    return response.data
  },
}

// User API functions
export const userAPI = {
  // Login
  login: async (username, password) => {
    const response = await api.post('/api/users/login', { username, password })
    return response.data
  },

  // Register
  register: async (username, email, password) => {
    const response = await api.post('/api/users/register', { username, email, password })
    return response.data
  },

  // Get profile
  getProfile: async () => {
    const response = await api.get('/api/users/profile')
    return response.data
  },
}

// Admin API functions
export const adminAPI = {
  // Get admin dashboard overview
  getOverview: async () => {
    const response = await api.get('/api/admin/overview')
    return response.data
  },

  // Get system statistics
  getSystemStats: async () => {
    const response = await api.get('/api/admin/stats')
    return response.data
  },

  // Get all users
  getAllUsers: async (page = 1, limit = 20, search = '', role = 'all', status = 'all') => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search,
      role,
      status
    })
    const response = await api.get(`/api/admin/users?${params}`)
    return response.data
  },

  // Get user details
  getUserDetails: async (userId) => {
    const response = await api.get(`/api/admin/users/${userId}`)
    return response.data
  },

  // Toggle user status
  toggleUserStatus: async (userId) => {
    const response = await api.patch(`/api/admin/users/${userId}/toggle-status`)
    return response.data
  },

  // Get all articles
  getAllArticles: async (page = 1, limit = 20, search = '', status = 'all', language = 'all', sentiment = 'all') => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search,
      status,
      language,
      sentiment
    })
    const response = await api.get(`/api/admin/articles?${params}`)
    return response.data
  },

  // Delete article
  deleteArticle: async (articleId) => {
    const response = await api.delete(`/api/admin/articles/${articleId}`)
    return response.data
  }
}

export default api
