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
  RefreshCw,
  Globe
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
  const [autoRefreshing, setAutoRefreshing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [currentPage])

  // Auto-refresh when there are processing articles
  useEffect(() => {
    const hasProcessingArticles = articles.some(article => 
      article.processingStatus === 'processing' || article.processingStatus === 'pending'
    )

    if (hasProcessingArticles) {
      setAutoRefreshing(true)
      const interval = setInterval(async () => {
        console.log('Auto-refreshing dashboard due to processing articles...')
        await fetchData()
      }, 10000) // Refresh every 10 seconds

      return () => {
        clearInterval(interval)
        setAutoRefreshing(false)
      }
    } else {
      setAutoRefreshing(false)
    }
  }, [articles])

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
      toast.error('Failed to load dashboard data')
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
  const getChartSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return '#10B981' // Green for Positive
      case 'negative': return '#EF4444' // Red for Negative
      case 'neutral': return '#6B7280'  // Gray for Neutral
      default: return '#9CA3AF'         // Default gray
    }
  }

  // Process sentiment distribution to merge Mixed with Neutral
  const processedSentimentData = analytics?.sentimentDistribution?.reduce((acc, item) => {
    const sentiment = item._id === 'Mixed' ? 'Neutral' : item._id
    const existing = acc.find(entry => entry._id === sentiment)
    if (existing) {
      existing.count += item.count
    } else {
      acc.push({ _id: sentiment, count: item.count })
    }
    return acc
  }, []) || []

  const sentimentDistributionData = {
    labels: processedSentimentData.map(item => item._id),
    datasets: [
      {
        data: processedSentimentData.map(item => item.count),
        backgroundColor: processedSentimentData.map(item => getChartSentimentColor(item._id)),
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

  // Process trend data for meaningful visualization (merge Mixed with Neutral)
  const rawTrendData = analytics?.sentimentTrend?.map(item => ({
    ...item,
    _id: {
      ...item._id,
      sentiment: item._id.sentiment === 'Mixed' ? 'Neutral' : item._id.sentiment
    }
  })) || []
  
  // Aggregate counts for same date/sentiment combinations after transformation
  const trendData = rawTrendData.reduce((acc, item) => {
    const key = `${item._id.date}-${item._id.sentiment}`
    const existing = acc.find(entry => `${entry._id.date}-${entry._id.sentiment}` === key)
    if (existing) {
      existing.count += item.count
    } else {
      acc.push(item)
    }
    return acc
  }, [])
  const dates = [...new Set(trendData.map(item => item._id.date))].sort()
  const sentiments = ['Positive', 'Negative', 'Neutral']
  
  // Calculate sentiment percentages for more meaningful visualization
  const sentimentTrendData = {
    labels: dates.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: sentiments.map((sentiment, index) => {
      const colors = {
        'Positive': { border: '#10B981', bg: '#10B98120', fill: '#ECFDF5' },
        'Negative': { border: '#EF4444', bg: '#EF444420', fill: '#FEF2F2' },
        'Neutral': { border: '#6B7280', bg: '#6B728020', fill: '#F9FAFB' },
      }
      
      return {
      label: sentiment,
        data: dates.map(date => {
          const dayTotal = trendData
            .filter(t => t._id.date === date)
            .reduce((sum, item) => sum + item.count, 0)
          
          const sentimentCount = trendData.find(t => t._id.date === date && t._id.sentiment === sentiment)?.count || 0
          
          // Return percentage instead of raw count
          return dayTotal > 0 ? Math.round((sentimentCount / dayTotal) * 100) : 0
        }),
        borderColor: colors[sentiment].border,
        backgroundColor: colors[sentiment].bg,
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: colors[sentiment].border,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        borderWidth: 3,
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-10 dark:opacity-20"></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-6 lg:mb-0">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
          <div>
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                      Sentiment Dashboard
            </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                      AI-powered insights from your content analysis
            </p>
          </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={fetchData}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-105"
                >
                  <RefreshCw className={`h-5 w-5 ${autoRefreshing ? 'animate-spin' : ''}`} />
                  <span className="font-medium">
                    {autoRefreshing ? 'Auto-Refreshing...' : 'Refresh Data'}
                  </span>
                </button>
                {autoRefreshing && (
                  <div className="flex items-center space-x-2 px-4 py-3 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Processing articles...</span>
                  </div>
                )}
            <Link
              to="/upload"
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-105 font-medium"
            >
                  <UploadIcon className="h-5 w-5" />
              <span>Upload Article</span>
            </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="group relative bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-blue-200/50 dark:border-blue-700/50">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">
                  Total Articles
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {analytics?.totalArticles || 0}
                </p>
                <div className="flex items-center text-xs text-blue-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>All time</span>
                </div>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-xl group-hover:bg-blue-500/20 transition-colors duration-300">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-green-200/50 dark:border-green-700/50">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-emerald-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-1">
                  Analyzed
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {analytics?.completedAnalysis || 0}
                </p>
                <div className="flex items-center text-xs text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span>
                    {analytics?.totalArticles > 0 
                      ? Math.round(((analytics?.completedAnalysis || 0) / analytics?.totalArticles) * 100)
                      : 0}% complete
                  </span>
                </div>
              </div>
              <div className="bg-green-500/10 p-3 rounded-xl group-hover:bg-green-500/20 transition-colors duration-300">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-purple-200/50 dark:border-purple-700/50">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-pink-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-1">
                  Languages
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {analytics?.languageBreakdown?.length || 0}
                </p>
                <div className="flex items-center text-xs text-purple-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
                  <span>Total Languages</span>
                </div>
              </div>
              <div className="bg-purple-500/10 p-3 rounded-xl group-hover:bg-purple-500/20 transition-colors duration-300">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-orange-200/50 dark:border-orange-700/50">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/5 to-red-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-1">
                  This Month
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {articles.filter(article => {
                    const articleDate = new Date(article.createdAt)
                    const now = new Date()
                    return articleDate.getMonth() === now.getMonth() && 
                           articleDate.getFullYear() === now.getFullYear()
                  }).length}
                </p>
                <div className="flex items-center text-xs text-orange-600">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>{new Date().toLocaleDateString('en-US', { month: 'long' })}</span>
                </div>
              </div>
              <div className="bg-orange-500/10 p-3 rounded-xl group-hover:bg-orange-500/20 transition-colors duration-300">
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Charts */}
        {analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Sentiment Distribution */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Sentiment Distribution
              </h3>
                <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              {analytics.sentimentDistribution?.length > 0 ? (
                <div className="h-80">
                  <Pie 
                    data={sentimentDistributionData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                              size: 12,
                              weight: '500'
                            }
                          }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: 'white',
                          bodyColor: 'white',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          borderWidth: 1,
                          callbacks: {
                            label: function(context) {
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percentage = ((context.parsed / total) * 100).toFixed(1);
                              return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                          }
                        }
                      },
                      elements: {
                        arc: {
                          borderWidth: 2,
                          borderColor: '#ffffff'
                        }
                      }
                    }} 
                  />
                </div>
              ) : (
                <div className="h-80 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                  <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No sentiment data available</p>
                  <p className="text-sm">Upload and analyze some articles to see insights</p>
                </div>
              )}
            </div>

            {/* Language Breakdown */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Language Distribution
              </h3>
                <div className="bg-purple-100 dark:bg-purple-900/20 p-2 rounded-lg">
                  <Globe className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              {analytics.languageBreakdown?.length > 0 ? (
                <div className="h-80">
                  <Bar 
                    data={languageBreakdownData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: 'white',
                          bodyColor: 'white',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          borderWidth: 1,
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            precision: 0,
                            font: {
                              size: 11
                            }
                          },
                          grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                          }
                        },
                        x: {
                          ticks: {
                            font: {
                              size: 11,
                              weight: '500'
                            }
                          },
                          grid: {
                            display: false
                          }
                        }
                      },
                      elements: {
                        bar: {
                          borderRadius: 8,
                          borderWidth: 0
                        }
                      }
                    }} 
                  />
                </div>
              ) : (
                <div className="h-80 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                  <Globe className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No language data available</p>
                  <p className="text-sm">Upload articles to see language distribution</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Sentiment Trend */}
        {analytics && analytics.sentimentTrend?.length > 0 && (
          <div className="space-y-8 mb-12">
            {/* Sentiment Percentage Trends */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Sentiment Trends (Last 30 Days)
            </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Percentage distribution of sentiments over time
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="h-80">
              <Line 
                data={sentimentTrendData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                    interaction: {
                      mode: 'index',
                      intersect: false,
                    },
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          usePointStyle: true,
                          padding: 20,
                          font: {
                            size: 12,
                            weight: '500'
                          }
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        callbacks: {
                          label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y}%`;
                          }
                        }
                      }
                    },
                  scales: {
                      x: {
                        display: true,
                        title: {
                          display: true,
                          text: 'Date',
                          font: {
                            size: 12,
                            weight: '600'
                          }
                        },
                        ticks: {
                          font: {
                            size: 11
                          }
                        },
                        grid: {
                          color: 'rgba(0, 0, 0, 0.1)'
                        }
                      },
                      y: {
                        display: true,
                        title: {
                          display: true,
                          text: 'Percentage (%)',
                          font: {
                            size: 12,
                            weight: '600'
                          }
                        },
                        min: 0,
                        max: 100,
                        ticks: {
                          callback: function(value) {
                            return value + '%';
                          },
                          font: {
                            size: 11
                          }
                        },
                        grid: {
                          color: 'rgba(0, 0, 0, 0.1)'
                        }
                      },
                    },
                  }} 
                />
              </div>
            </div>

          </div>
        )}

        {/* Enhanced Articles Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Recent Articles
            </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Your latest sentiment analysis results
                </p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            {articles.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>File</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4" />
                        <span>Heading</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4" />
                        <span>Sentiment</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4" />
                        <span>Language</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Date</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {articles.map((article, index) => (
                    <tr key={article._id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10 transition-all duration-200">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {article.originalName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              {article.fileType.toUpperCase()} • {Math.round(article.fileSize / 1024)}KB
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm text-gray-900 dark:text-white max-w-xs">
                          <div className="truncate font-medium">{article.heading}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Added {new Date(article.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="group relative">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-help ${getSentimentColor(article.headingSentiment)}`}>
                            H: {article.headingSentiment}
                          </span>
                            {article.headingSentimentReason && (
                              <div className="absolute z-10 invisible group-hover:visible bg-gray-900 text-white text-xs rounded-lg px-3 py-2 left-0 top-full mt-1 w-64 shadow-lg">
                                <div className="font-medium mb-1">Heading Analysis:</div>
                                <div>{article.headingSentimentReason}</div>
                                <div className="absolute -top-1 left-2 w-2 h-2 bg-gray-900 rotate-45"></div>
                              </div>
                            )}
                          </div>
                          <div className="group relative">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-help ${getSentimentColor(article.contentSentiment)}`}>
                            C: {article.contentSentiment}
                          </span>
                            {article.contentSentimentReason && (
                              <div className="absolute z-10 invisible group-hover:visible bg-gray-900 text-white text-xs rounded-lg px-3 py-2 left-0 top-full mt-1 w-64 shadow-lg">
                                <div className="font-medium mb-1">Content Analysis:</div>
                                <div>{article.contentSentimentReason}</div>
                                <div className="absolute -top-1 left-2 w-2 h-2 bg-gray-900 rotate-45"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          {/* <div className="flex space-x-1 mr-2">
                            {article.detectedLanguage === 'english' && <span className="text-sm">🇺🇸</span>}
                            {article.detectedLanguage === 'hindi' && <span className="text-sm">🇮🇳</span>}
                            {article.detectedLanguage === 'gujarati' && <span className="text-sm">🇮🇳</span>}
                            {article.detectedLanguage === 'mixed' && <span className="text-sm">🌐</span>}
                            {article.detectedLanguage === 'unknown' && <span className="text-sm">❓</span>}
                          </div> */}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getLanguageDisplay(article.detectedLanguage)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            article.processingStatus === 'completed' ? 'bg-green-500 animate-pulse' :
                            article.processingStatus === 'processing' ? 'bg-yellow-500 animate-spin' :
                            article.processingStatus === 'failed' ? 'bg-red-500' :
                            'bg-gray-400'
                          }`}></div>
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            article.processingStatus === 'completed' ? 'text-green-800 bg-green-100 dark:bg-green-900/20 dark:text-green-400' :
                            article.processingStatus === 'processing' ? 'text-yellow-800 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            article.processingStatus === 'failed' ? 'text-red-800 bg-red-100 dark:bg-red-900/20 dark:text-red-400' :
                            'text-gray-800 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {article.processingStatus.charAt(0).toUpperCase() + article.processingStatus.slice(1)}
                        </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white font-medium">
                          {new Date(article.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(article.createdAt).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-3">
                          <Link
                            to={`/article/${article._id}`}
                            className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 rounded-lg transition-colors duration-200"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteArticle(article._id)}
                            className="inline-flex items-center justify-center w-8 h-8 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 rounded-lg transition-colors duration-200"
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
            ) : (
              <div className="text-center py-16 px-6">
                <div className="max-w-md mx-auto">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                    <FileText className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No articles yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8">
                    Upload your first article to start analyzing sentiment and get insights from your content.
                  </p>
                  <div className="space-y-4">
                <Link
                  to="/upload"
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                      <UploadIcon className="h-5 w-5 mr-2" />
                      Upload Your First Article
                </Link>
                    <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        <span>PDF, DOCX, TXT</span>
                      </div>
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 mr-1" />
                        <span>Multi-language</span>
                      </div>
                      <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        <span>AI Analysis</span>
                      </div>
                    </div>
                  </div>
                </div>
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
