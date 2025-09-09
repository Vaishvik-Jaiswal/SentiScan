import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  FileText, 
  TrendingUp, 
  BarChart3, 
  Calendar, 
  Trash2,
  Eye,
  Upload as UploadIcon,
  RefreshCw
} from 'lucide-react'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js'
import { Pie, Line, Bar } from 'react-chartjs-2'
import { articleAPI } from '../services/api'
import { toast } from 'react-toastify'

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement
)

export default function Dashboard() {
  const [articles, setArticles] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState(null)

  useEffect(() => {
    fetchData()
  }, [currentPage])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [articlesData, analyticsData] = await Promise.all([
        articleAPI.getUserArticles(currentPage, 10),
        articleAPI.getAnalytics()
      ])
      
      setArticles(articlesData.articles)
      setPagination(articlesData.pagination)
      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Error fetching data:', error)
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please login again.')
      } else {
        toast.error(error.response?.data?.message || 'Failed to load dashboard data')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteArticle = async (id) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return
    
    try {
      await articleAPI.deleteArticle(id)
      toast.success('Article deleted successfully')
      fetchData()
    } catch (error) {
      console.error('Error deleting article:', error)
      toast.error('Failed to delete article')
    }
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'Positive': return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'Negative': return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      case 'Mixed': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
    }
  }

  const getLanguageDisplay = (lang) => {
    switch (lang) {
      case 'english': return 'English'
      case 'hindi': return 'Hindi'
      case 'gujarati': return 'Gujarati'
      case 'mixed': return 'Mixed'
      default: return 'Unknown'
    }
  }

  // Chart configurations
  const sentimentDistributionData = {
    labels: analytics?.sentimentDistribution?.map(item => item._id) || [],
    datasets: [
      {
        data: analytics?.sentimentDistribution?.map(item => item.count) || [],
        backgroundColor: [
          '#10B981', // Green for Positive
          '#EF4444', // Red for Negative
          '#6B7280', // Gray for Neutral
          '#F59E0B', // Yellow for Mixed
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  }

  const languageBreakdownData = {
    labels: analytics?.languageBreakdown?.map(item => getLanguageDisplay(item._id)) || [],
    datasets: [
      {
        label: 'Articles by Language',
        data: analytics?.languageBreakdown?.map(item => item.count) || [],
        backgroundColor: [
          '#3B82F6',
          '#8B5CF6',
          '#06B6D4',
          '#10B981',
          '#F59E0B',
        ],
      },
    ],
  }

  // Process trend data
  const trendData = analytics?.sentimentTrend || []
  const dates = [...new Set(trendData.map(item => item._id.date))].sort()
  const sentiments = ['Positive', 'Negative', 'Neutral', 'Mixed']
  
  const sentimentTrendData = {
    labels: dates,
    datasets: sentiments.map((sentiment, index) => ({
      label: sentiment,
      data: dates.map(date => {
        const item = trendData.find(t => t._id.date === date && t._id.sentiment === sentiment)
        return item ? item.count : 0
      }),
      borderColor: ['#10B981', '#EF4444', '#6B7280', '#F59E0B'][index],
      backgroundColor: ['#10B981', '#EF4444', '#6B7280', '#F59E0B'][index] + '20',
      tension: 0.1,
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Sentiment Analysis Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Track and analyze sentiment across your uploaded articles
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={fetchData}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <Link
              to="/upload"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <UploadIcon className="h-4 w-4" />
              <span>Upload Article</span>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Articles
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics?.totalArticles || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Analyzed
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics?.completedAnalysis || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Languages
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics?.languageBreakdown?.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  This Month
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {articles.filter(article => {
                    const articleDate = new Date(article.createdAt)
                    const now = new Date()
                    return articleDate.getMonth() === now.getMonth() && 
                           articleDate.getFullYear() === now.getFullYear()
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        {analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Sentiment Distribution */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Sentiment Distribution
              </h3>
              {analytics.sentimentDistribution?.length > 0 ? (
                <div className="h-64">
                  <Pie 
                    data={sentimentDistributionData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                        },
                      },
                    }} 
                  />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  No data available
                </div>
              )}
            </div>

            {/* Language Breakdown */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Language Distribution
              </h3>
              {analytics.languageBreakdown?.length > 0 ? (
                <div className="h-64">
                  <Bar 
                    data={languageBreakdownData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                    }} 
                  />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  No data available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sentiment Trend */}
        {analytics && analytics.sentimentTrend?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Sentiment Trend (Last 30 Days)
            </h3>
            <div className="h-64">
              <Line 
                data={sentimentTrendData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }} 
              />
            </div>
          </div>
        )}

        {/* Articles Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Articles
            </h3>
          </div>
          <div className="overflow-x-auto">
            {articles.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Heading
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Sentiment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Language
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {articles.map((article) => (
                    <tr 
                      key={article._id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => navigate(`/article/${article._id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {article.originalName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {article.fileType.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                          {article.heading}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSentimentColor(article.headingSentiment)}`}>
                            H: {article.headingSentiment}
                          </span>
                          <br />
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSentimentColor(article.contentSentiment)}`}>
                            C: {article.contentSentiment}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {getLanguageDisplay(article.detectedLanguage)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          article.processingStatus === 'completed' ? 'text-green-800 bg-green-100 dark:bg-green-900/20' :
                          article.processingStatus === 'processing' ? 'text-yellow-800 bg-yellow-100 dark:bg-yellow-900/20' :
                          article.processingStatus === 'failed' ? 'text-red-800 bg-red-100 dark:bg-red-900/20' :
                          'text-gray-800 bg-gray-100 dark:bg-gray-900/20'
                        }`}>
                          {article.processingStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(article.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            to={`/article/${article._id}`}
                            className="text-blue-600 hover:text-blue-500"
                            onClick={(e) => e.stopPropagation()}
                            title="View article"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click
                              handleDeleteArticle(article._id);
                            }}
                            className="text-red-600 hover:text-red-500"
                            title="Delete article"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No articles uploaded yet
                </p>
                <Link
                  to="/upload"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <UploadIcon className="h-4 w-4" />
                  <span>Upload Your First Article</span>
                </Link>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} articles
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                    disabled={currentPage === pagination.pages}
                    className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
