import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Newspaper, 
  Calendar, 
  FileText, 
  BarChart3,
  TrendingUp,
  Globe,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Languages
} from 'lucide-react'
import { toast } from 'react-toastify'
import { newspaperAPI } from '../services/api'
import { Pie, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const NewspaperDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [newspaper, setNewspaper] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchNewspaper()
    // Auto-refresh if still processing
    const interval = setInterval(() => {
      if (newspaper?.processingStatus === 'processing') {
        fetchNewspaper(true)
      }
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [id, newspaper?.processingStatus])

  const fetchNewspaper = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    
    try {
      const data = await newspaperAPI.getNewspaperById(id)
      setNewspaper(data)
    } catch (error) {
      console.error('Error fetching newspaper:', error)
      if (error.response?.status === 404) {
        toast.error('Newspaper not found')
        navigate('/newspaper-upload')
      } else {
        toast.error('Failed to load newspaper details')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'negative': return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

  // Sentiment data for charts and display
  const sentimentData = newspaper ? {
    positive: newspaper.sentimentDistribution?.positive || 0,
    negative: newspaper.sentimentDistribution?.negative || 0,
    neutral: newspaper.sentimentDistribution?.neutral || 0
  } : { positive: 0, negative: 0, neutral: 0 }

  // Chart data
  const sentimentChartData = newspaper ? {
    labels: ['Positive', 'Negative', 'Neutral'],
    datasets: [{
      data: [
        sentimentData.positive,
        sentimentData.negative,
        sentimentData.neutral
      ],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(156, 163, 175, 0.8)'
      ],
      borderColor: [
        'rgba(34, 197, 94, 1)',
        'rgba(239, 68, 68, 1)',
        'rgba(156, 163, 175, 1)'
      ],
      borderWidth: 2
    }]
  } : null

  const languageChartData = newspaper ? {
    labels: Object.keys(newspaper.languageBreakdown || {})
      .filter(lang => newspaper.languageBreakdown[lang] > 0)
      .map(lang => getLanguageDisplay(lang)),
    datasets: [{
      label: 'Articles',
      data: Object.keys(newspaper.languageBreakdown || {})
        .filter(lang => newspaper.languageBreakdown[lang] > 0)
        .map(lang => newspaper.languageBreakdown[lang]),
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(236, 72, 153, 0.8)'
      ],
      borderWidth: 1
    }]
  } : null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!newspaper) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Newspaper Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The newspaper you're looking for doesn't exist or has been deleted.
          </p>
          <Link
            to="/newspaper-upload"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Upload
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              to="/newspaper-upload"
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
              <Newspaper className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                {newspaper.newspaperName}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                Comprehensive newspaper sentiment analysis
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => fetchNewspaper(true)}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              {newspaper.processingStatus === 'completed' && (
                <button
                  onClick={async () => {
                    try {
                      console.log('📄 Downloading PDF report for newspaper:', newspaper._id)
                      const response = await newspaperAPI.generatePDFReport(newspaper._id)
                      
                      // Create blob and download
                      const blob = new Blob([response], { type: 'application/pdf' })
                      const url = window.URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `newspaper-analysis-${newspaper.newspaperName.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      window.URL.revokeObjectURL(url)
                      
                      console.log('✅ PDF download initiated')
                    } catch (error) {
                      console.error('❌ Error downloading PDF:', error)
                      toast.error('Failed to download PDF report')
                      
                      // Fallback: try direct URL approach
                      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
                      const token = localStorage.getItem('token')
                      const url = `${API_BASE_URL}/api/newspaper/${newspaper._id}/pdf-report?token=${token}`
                      window.open(url, '_blank')
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Banner */}
        {newspaper.processingStatus !== 'completed' && (
          <div className={`mb-8 p-4 rounded-lg border ${
            newspaper.processingStatus === 'processing' 
              ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700' 
              : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
          }`}>
            <div className="flex items-center">
              {getStatusIcon(newspaper.processingStatus)}
              <div className="ml-3">
                <h3 className={`font-medium ${
                  newspaper.processingStatus === 'processing' 
                    ? 'text-blue-800 dark:text-blue-200' 
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {newspaper.processingStatus === 'processing' 
                    ? 'Analysis in Progress' 
                    : 'Analysis Failed'
                  }
                </h3>
                <p className={`text-sm ${
                  newspaper.processingStatus === 'processing' 
                    ? 'text-blue-600 dark:text-blue-300' 
                    : 'text-red-600 dark:text-red-300'
                }`}>
                  {newspaper.processingStatus === 'processing' 
                    ? 'Your newspaper is being analyzed. This may take several minutes...' 
                    : newspaper.processingError || 'An error occurred during analysis.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {newspaper.processingStatus === 'completed' && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">
                      Total Articles
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {newspaper.totalArticles}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-1">
                      Overall Sentiment
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {newspaper.overallSentiment}
                    </p>
                    <p className="text-sm text-gray-500">
                      Score: {newspaper.sentimentScore}/100
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-1">
                      Dominant Language
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {getLanguageDisplay(newspaper.dominantLanguage)}
                    </p>
                  </div>
                  <Languages className="h-8 w-8 text-purple-600" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-1">
                      Quality Score
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {newspaper.analysisMetrics?.qualityScore || 0}
                    </p>
                    <p className="text-sm text-gray-500">
                      /100
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Enhanced Charts Section */}
            <div className="space-y-8 mb-8">
              {/* Primary Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sentiment Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                    Sentiment Distribution
                  </h3>
                  {sentimentChartData && (
                    <div className="h-80">
                      <Pie 
                        data={sentimentChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: {
                                padding: 20,
                                usePointStyle: true,
                              }
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                  const percentage = ((context.parsed / total) * 100).toFixed(1);
                                  return `${context.label}: ${context.parsed} (${percentage}%)`;
                                }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  )}
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{sentimentData.positive}</div>
                      <div className="text-sm text-green-700 dark:text-green-400">Positive</div>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{sentimentData.negative}</div>
                      <div className="text-sm text-red-700 dark:text-red-400">Negative</div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">{sentimentData.neutral}</div>
                      <div className="text-sm text-gray-700 dark:text-gray-400">Neutral</div>
                    </div>
                  </div>
                </div>

                {/* Language Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Globe className="h-5 w-5 mr-2 text-green-600" />
                    Language Distribution
                  </h3>
                  {languageChartData && (
                    <div className="h-80">
                      <Bar 
                        data={languageChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                  const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                                  return `${context.parsed.y} articles (${percentage}%)`;
                                }
                              }
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                stepSize: 1
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  )}
                  <div className="mt-4 text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Dominant Language: <span className="font-semibold text-gray-900 dark:text-white">
                        {getLanguageDisplay(newspaper.dominantLanguage)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Article Length Analysis */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-purple-600" />
                    Article Lengths
                  </h3>
                  {newspaper.articles && (
                    <div className="space-y-3">
                      {(() => {
                        const wordCounts = newspaper.articles.map(a => a.wordCount || 0);
                        const avgLength = Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length);
                        const shortArticles = wordCounts.filter(count => count <= 100).length;
                        const mediumArticles = wordCounts.filter(count => count > 100 && count <= 300).length;
                        const longArticles = wordCounts.filter(count => count > 300).length;
                        
                        return (
                          <>
                            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                              <div className="text-2xl font-bold text-purple-600">{avgLength}</div>
                              <div className="text-sm text-purple-700 dark:text-purple-400">Avg Words</div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Short (≤100)</span>
                                <span className="font-semibold">{shortArticles}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Medium (101-300)</span>
                                <span className="font-semibold">{mediumArticles}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Long (300+)</span>
                                <span className="font-semibold">{longArticles}</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Confidence Analysis */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-orange-600" />
                    Analysis Confidence
                  </h3>
                  {newspaper.articles && (
                    <div className="space-y-3">
                      {(() => {
                        const highConf = newspaper.articles.filter(a => a.sentimentConfidence === 'high').length;
                        const mediumConf = newspaper.articles.filter(a => a.sentimentConfidence === 'medium').length;
                        const lowConf = newspaper.articles.filter(a => a.sentimentConfidence === 'low').length;
                        const total = newspaper.articles.length;
                        
                        return (
                          <>
                            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                              <div className="text-2xl font-bold text-orange-600">
                                {total > 0 ? Math.round((highConf / total) * 100) : 0}%
                              </div>
                              <div className="text-sm text-orange-700 dark:text-orange-400">High Confidence</div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">High</span>
                                <span className="font-semibold text-green-600">{highConf}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Medium</span>
                                <span className="font-semibold text-yellow-600">{mediumConf}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Low</span>
                                <span className="font-semibold text-red-600">{lowConf}</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Quality Metrics */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-blue-600" />
                    Quality Metrics
                  </h3>
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {newspaper.analysisMetrics?.qualityScore || 0}
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-400">Quality Score</div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Words</span>
                        <span className="font-semibold">
                          {newspaper.analysisMetrics?.totalWordCount?.toLocaleString() || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Avg Length</span>
                        <span className="font-semibold">
                          {newspaper.analysisMetrics?.averageArticleLength || 0} words
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Languages</span>
                        <span className="font-semibold">
                          {Object.keys(newspaper.languageBreakdown || {}).length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Summary */}
            {newspaper.compiledReport && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Analysis Summary
                </h3>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {newspaper.compiledReport.summary}
                  </p>
                </div>

                {newspaper.compiledReport.keyFindings && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Key Findings
                    </h4>
                    <ul className="space-y-2">
                      {newspaper.compiledReport.keyFindings.map((finding, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Categorized Articles by Sentiment */}
            <div className="space-y-8">
              {/* Positive Articles */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                    Positive Articles
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400 bg-green-100 dark:bg-green-900/20 px-3 py-1 rounded-full">
                    {newspaper.articles?.filter(article => article.contentSentiment === 'Positive').length || 0} articles
                  </span>
                </div>

                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {newspaper.articles?.filter(article => article.contentSentiment === 'Positive').map((article, index) => (
                    <div
                      key={index}
                      className="border border-green-200 dark:border-green-700/50 rounded-lg p-4 bg-green-50/50 dark:bg-green-900/10 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                            {article.title}
                          </h4>
                          {article.contentSentimentReason && (
                            <div className="bg-green-50 dark:bg-green-900/10 border-l-4 border-green-400 p-3 rounded">
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                <strong className="text-green-700 dark:text-green-400">Why Positive:</strong> {article.contentSentimentReason}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                            {article.sentimentConfidence} confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {newspaper.articles?.filter(article => article.contentSentiment === 'Positive').length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No positive articles found in this newspaper.
                    </div>
                  )}
                </div>
              </div>

              {/* Negative Articles */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
                    Negative Articles
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400 bg-red-100 dark:bg-red-900/20 px-3 py-1 rounded-full">
                    {newspaper.articles?.filter(article => article.contentSentiment === 'Negative').length || 0} articles
                  </span>
                </div>

                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {newspaper.articles?.filter(article => article.contentSentiment === 'Negative').map((article, index) => (
                    <div
                      key={index}
                      className="border border-red-200 dark:border-red-700/50 rounded-lg p-4 bg-red-50/50 dark:bg-red-900/10 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                            {article.title}
                          </h4>
                          {article.contentSentimentReason && (
                            <div className="bg-red-50 dark:bg-red-900/10 border-l-4 border-red-400 p-3 rounded">
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                <strong className="text-red-700 dark:text-red-400">Why Negative:</strong> {article.contentSentimentReason}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                            {article.sentimentConfidence} confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {newspaper.articles?.filter(article => article.contentSentiment === 'Negative').length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No negative articles found in this newspaper.
                    </div>
                  )}
                </div>
              </div>

              {/* Neutral Articles */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <div className="w-4 h-4 bg-gray-500 rounded-full mr-3"></div>
                    Neutral Articles
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    {newspaper.articles?.filter(article => article.contentSentiment === 'Neutral').length || 0} articles
                  </span>
                </div>

                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {newspaper.articles?.filter(article => article.contentSentiment === 'Neutral').map((article, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-700/20 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                            {article.title}
                          </h4>
                          {article.contentSentimentReason && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 border-l-4 border-gray-400 p-3 rounded">
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                <strong className="text-gray-700 dark:text-gray-400">Why Neutral:</strong> {article.contentSentimentReason}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {article.sentimentConfidence} confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {newspaper.articles?.filter(article => article.contentSentiment === 'Neutral').length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No neutral articles found in this newspaper.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Metadata */}
        <div className="mt-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">File Size:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {formatFileSize(newspaper.fileSize)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Uploaded:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {new Date(newspaper.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Publication:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {new Date(newspaper.publicationDate).toLocaleDateString()}
              </span>
            </div>
            {newspaper.reportGeneratedAt && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Analyzed:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {new Date(newspaper.reportGeneratedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewspaperDetail
