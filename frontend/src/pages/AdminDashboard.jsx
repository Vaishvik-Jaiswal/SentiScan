import { useState, useEffect } from 'react'
import { 
  Users, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  Activity,
  Shield,
  Search,
  Eye,
  Trash2,
  RefreshCw,
  Calendar,
  Globe,
  Brain,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { adminAPI } from '../services/api'
import { toast } from 'react-toastify'
import { Pie, Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [articles, setArticles] = useState([])
  const [systemStats, setSystemStats] = useState(null)
  const [usersPagination, setUsersPagination] = useState({})
  const [articlesPagination, setArticlesPagination] = useState({})
  const [filters, setFilters] = useState({
    users: { search: '', role: 'all', status: 'all', page: 1 },
    articles: { search: '', status: 'all', language: 'all', sentiment: 'all', page: 1 }
  })

  useEffect(() => {
    fetchOverviewData()
  }, [])

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers()
    } else if (activeTab === 'articles') {
      fetchArticles()
    } else if (activeTab === 'stats') {
      fetchSystemStats()
    }
  }, [activeTab, filters])

  const fetchOverviewData = async () => {
    try {
      setLoading(true)
      const data = await adminAPI.getOverview()
      setOverview(data.data)
    } catch (error) {
      console.error('Error fetching overview:', error)
      toast.error('Failed to fetch overview data')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { search, role, status, page } = filters.users
      const data = await adminAPI.getAllUsers(page, 20, search, role, status)
      setUsers(data.data.users)
      setUsersPagination(data.data.pagination)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to fetch users')
    }
  }

  const fetchArticles = async () => {
    try {
      const { search, status, language, sentiment, page } = filters.articles
      const data = await adminAPI.getAllArticles(page, 20, search, status, language, sentiment)
      setArticles(data.data.articles)
      setArticlesPagination(data.data.pagination)
    } catch (error) {
      console.error('Error fetching articles:', error)
      toast.error('Failed to fetch articles')
    }
  }

  const fetchSystemStats = async () => {
    try {
      const data = await adminAPI.getSystemStats()
      setSystemStats(data.data)
    } catch (error) {
      console.error('Error fetching system stats:', error)
      toast.error('Failed to fetch system statistics')
    }
  }


  const handleDeleteArticle = async (articleId) => {
    if (!window.confirm('Are you sure you want to delete this article?')) {
      return
    }

    try {
      await adminAPI.deleteArticle(articleId)
      toast.success('Article deleted successfully')
      fetchArticles()
    } catch (error) {
      console.error('Error deleting article:', error)
      toast.error('Failed to delete article')
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'Positive':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'Negative':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      case 'Mixed':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
    }
  }

  if (loading && !overview) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <Shield className="h-8 w-8 mr-3 text-blue-600" />
                Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage users, articles, and monitor platform analytics
              </p>
            </div>
            <button
              onClick={fetchOverviewData}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: BarChart3 },
                { id: 'users', name: 'Users', icon: Users },
                { id: 'articles', name: 'Articles', icon: FileText },
                { id: 'stats', name: 'Statistics', icon: TrendingUp }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && overview && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {overview.overview.totalUsers || 0}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      +{overview.overview.newUsersLast30Days || 0} this month
                    </p>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-full">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Articles</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {overview.overview.totalArticles || 0}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      +{overview.overview.newArticlesLast30Days || 0} this month
                    </p>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {overview.topActiveUsers?.length || 0}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Users with articles
                    </p>
                  </div>
                  <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-full">
                    <Activity className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Processing Status</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {(overview.distributions?.processingStatus?.completed || 0) + 
                       (overview.distributions?.processingStatus?.processing || 0) + 
                       (overview.distributions?.processingStatus?.pending || 0) + 
                       (overview.distributions?.processingStatus?.failed || 0)}
                    </p>
                    <p className="text-sm text-orange-600 dark:text-orange-400">
                      {overview.distributions?.processingStatus?.completed || 0} completed
                    </p>
                  </div>
                  <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-full">
                    <BarChart3 className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Sentiment Distribution */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Sentiment Distribution
                </h3>
                <div className="h-64">
                  {overview.distributions?.sentiment && Object.keys(overview.distributions.sentiment).length > 0 ? (
                    <Pie
                      data={{
                        labels: Object.keys(overview.distributions.sentiment),
                        datasets: [{
                          data: Object.values(overview.distributions.sentiment),
                          backgroundColor: Object.keys(overview.distributions.sentiment).map(sentiment => {
                            switch (sentiment?.toLowerCase()) {
                              case 'positive': return '#10B981' // Green for Positive
                              case 'negative': return '#EF4444' // Red for Negative
                              case 'neutral': return '#6B7280'  // Gray for Neutral
                              case 'mixed': return '#F59E0B'    // Yellow for Mixed
                              default: return '#9CA3AF'         // Default gray
                            }
                          }),
                          borderWidth: 0
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom'
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No sentiment data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Language Distribution */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Language Distribution
                </h3>
                <div className="h-64">
                  {overview.distributions?.language && Object.keys(overview.distributions.language).length > 0 ? (
                    <Bar
                      data={{
                        labels: Object.keys(overview.distributions.language).map(lang => 
                          lang.charAt(0).toUpperCase() + lang.slice(1)
                        ),
                        datasets: [{
                          label: 'Articles',
                          data: Object.values(overview.distributions.language),
                          backgroundColor: '#3B82F6',
                          borderRadius: 8
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      <div className="text-center">
                        <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No language data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Top Active Users */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Active Users
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">User</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Articles</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.topActiveUsers && overview.topActiveUsers.length > 0 ? (
                      overview.topActiveUsers.map((user, index) => (
                        <tr key={user._id} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{user.username}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              {user.articleCount}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'No activity'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="py-8 text-center text-gray-500 dark:text-gray-400">
                          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No active users found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Users
                  </label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      value={filters.users.search}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        users: { ...prev.users, search: e.target.value, page: 1 }
                      }))}
                      placeholder="Search by username or email..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    value={filters.users.role}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      users: { ...prev.users, role: e.target.value, page: 1 }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Roles</option>
                    <option value="user">Users</option>
                    <option value="admin">Admins</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      users: { search: '', role: 'all', status: 'all', page: 1 }
                    }))}
                    className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="text-left py-3 px-6 font-medium text-gray-600 dark:text-gray-400">User</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-600 dark:text-gray-400">Role</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-600 dark:text-gray-400">Articles</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-600 dark:text-gray-400">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{user.username}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                            {user.articleCount}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {usersPagination.totalPages > 1 && (
                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing {((usersPagination.currentPage - 1) * 20) + 1} to {Math.min(usersPagination.currentPage * 20, usersPagination.totalUsers)} of {usersPagination.totalUsers} users
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        users: { ...prev.users, page: prev.users.page - 1 }
                      }))}
                      disabled={!usersPagination.hasPrev}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Page {usersPagination.currentPage} of {usersPagination.totalPages}
                    </span>
                    <button
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        users: { ...prev.users, page: prev.users.page + 1 }
                      }))}
                      disabled={!usersPagination.hasNext}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Articles Tab */}
        {activeTab === 'articles' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Articles
                  </label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      value={filters.articles.search}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        articles: { ...prev.articles, search: e.target.value, page: 1 }
                      }))}
                      placeholder="Search articles..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.articles.status}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      articles: { ...prev.articles, status: e.target.value, page: 1 }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="processing">Processing</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language
                  </label>
                  <select
                    value={filters.articles.language}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      articles: { ...prev.articles, language: e.target.value, page: 1 }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Languages</option>
                    <option value="english">English</option>
                    <option value="hindi">Hindi</option>
                    <option value="gujarati">Gujarati</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sentiment
                  </label>
                  <select
                    value={filters.articles.sentiment}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      articles: { ...prev.articles, sentiment: e.target.value, page: 1 }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Sentiments</option>
                    <option value="Positive">Positive</option>
                    <option value="Negative">Negative</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      articles: { search: '', status: 'all', language: 'all', sentiment: 'all', page: 1 }
                    }))}
                    className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Articles Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="text-left py-3 px-6 font-medium text-gray-600 dark:text-gray-400">Article</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-600 dark:text-gray-400">User</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-600 dark:text-gray-400">Language</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-600 dark:text-gray-400">Sentiment</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-600 dark:text-gray-400">Status</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-600 dark:text-gray-400">Size</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-600 dark:text-gray-400">Created</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-600 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((article) => (
                      <tr key={article._id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white truncate max-w-xs">
                              {article.heading || article.originalName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {article.fileType.toUpperCase()}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{article.user.username}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{article.user.email}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                            {article.detectedLanguage.charAt(0).toUpperCase() + article.detectedLanguage.slice(1)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSentimentColor(article.contentSentiment)}`}>
                            {article.contentSentiment}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            {getStatusIcon(article.processingStatus)}
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400 capitalize">
                              {article.processingStatus}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                          {formatFileSize(article.fileSize)}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(article.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                window.open(`/article/${article._id}`, '_blank')
                              }}
                              className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors dark:bg-blue-900/20 dark:hover:bg-blue-900/40"
                              title="View Article"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteArticle(article._id)}
                              className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors dark:bg-red-900/20 dark:hover:bg-red-900/40"
                              title="Delete Article"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {articlesPagination.totalPages > 1 && (
                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing {((articlesPagination.currentPage - 1) * 20) + 1} to {Math.min(articlesPagination.currentPage * 20, articlesPagination.totalArticles)} of {articlesPagination.totalArticles} articles
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        articles: { ...prev.articles, page: prev.articles.page - 1 }
                      }))}
                      disabled={!articlesPagination.hasPrev}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Page {articlesPagination.currentPage} of {articlesPagination.totalPages}
                    </span>
                    <button
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        articles: { ...prev.articles, page: prev.articles.page + 1 }
                      }))}
                      disabled={!articlesPagination.hasNext}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && systemStats && (
          <div className="space-y-8">
            {/* Activity Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Last 24 Hours</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">New Users</span>
                    <span className="font-bold text-blue-600">{systemStats.activity.last24Hours.newUsers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">New Articles</span>
                    <span className="font-bold text-green-600">{systemStats.activity.last24Hours.newArticles}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Last 7 Days</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">New Users</span>
                    <span className="font-bold text-blue-600">{systemStats.activity.last7Days.newUsers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">New Articles</span>
                    <span className="font-bold text-green-600">{systemStats.activity.last7Days.newArticles}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Last 30 Days</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">New Users</span>
                    <span className="font-bold text-blue-600">{systemStats.activity.last30Days.newUsers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">New Articles</span>
                    <span className="font-bold text-green-600">{systemStats.activity.last30Days.newArticles}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Stats */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Storage Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{systemStats.storage.totalMB} MB</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Storage Used</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{systemStats.storage.totalGB} GB</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Storage (GB)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{formatFileSize(systemStats.storage.averageFileSize)}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Average File Size</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{systemStats.totals.activeUsers}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
                </div>
              </div>
            </div>

            {/* Platform Totals */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Platform Totals</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{systemStats.totals.users}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                </div>
                <div className="text-center">
                  <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{systemStats.totals.articles}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Articles</p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 dark:bg-purple-900/20 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <Activity className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{systemStats.totals.activeUsers}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
