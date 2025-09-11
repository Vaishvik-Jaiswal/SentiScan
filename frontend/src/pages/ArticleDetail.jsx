import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, FileText, Calendar, Globe, TrendingUp, Download } from 'lucide-react'
import axios from 'axios'
import { articleAPI } from '../services/api'
import { toast } from 'react-toastify'
import FileViewer from '../components/FileViewer'

const ArticleDetail = () => {
  const { id } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchArticle()
  }, [id])

  const fetchArticle = async () => {
    try {
      const data = await articleAPI.getArticleById(id)
      setArticle(data)
    } catch (error) {
      console.error('Error fetching article:', error)
      toast.error('Failed to load article')
    } finally {
      setLoading(false)
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDownloadFile = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Please log in to download the file')
        return
      }

      console.log(`🔗 Getting download URL for article: ${article._id}`)

      // Get the direct download URL
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/articles/${article._id}/download-url`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      )

      const { downloadUrl, filename, isDirectUrl } = response.data

      // Create download link
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      if (isDirectUrl) {
        link.target = '_blank'
      }
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Download started')

    } catch (error) {
      console.error('Error downloading file:', error)
      toast.error('Failed to download file')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Article not found
          </h1>
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-500 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {article.heading}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center space-x-1">
                    <FileText className="h-4 w-4" />
                    <span>{article.originalName}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Globe className="h-4 w-4" />
                    <span>{getLanguageDisplay(article.detectedLanguage)}</span>
                  </div>
                </div>
              </div>
              <div className="ml-4 flex items-center space-x-3">
                <button
                  onClick={handleDownloadFile}
                  className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                  <Download className="h-3 w-3" />
                  <span>Download</span>
                </button>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  article.processingStatus === 'completed' ? 'text-green-800 bg-green-100 dark:bg-green-900/20' :
                  article.processingStatus === 'processing' ? 'text-yellow-800 bg-yellow-100 dark:bg-yellow-900/20' :
                  article.processingStatus === 'failed' ? 'text-red-800 bg-red-100 dark:bg-red-900/20' :
                  'text-gray-800 bg-gray-100 dark:bg-gray-900/20'
                }`}>
                  {article.processingStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* File Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  File Type
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {article.fileType.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  File Size
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatFileSize(article.fileSize)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Language
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {getLanguageDisplay(article.detectedLanguage)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sentiment Analysis Results */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Sentiment Analysis Results
            </h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Heading Sentiment */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg mr-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                </span>
                Heading Analysis
              </h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Classification
                  </span>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getSentimentColor(article.headingSentiment)}`}>
                    {article.headingSentiment}
                  </span>
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic mb-3">
                    "{article.heading}"
                  </p>
                  
                  {article.headingSentimentReason && (
                    <div className="bg-white dark:bg-gray-600 p-3 rounded-lg border-l-4 border-blue-500">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        AI Reasoning:
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {article.headingSentimentReason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Sentiment */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <span className="bg-green-100 dark:bg-green-900/20 p-2 rounded-lg mr-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </span>
                Content Analysis
              </h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Classification
                  </span>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getSentimentColor(article.contentSentiment)}`}>
                    {article.contentSentiment}
                  </span>
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Analysis completed on{' '}
                    {article.sentimentAnalysisDate 
                      ? new Date(article.sentimentAnalysisDate).toLocaleString()
                      : 'Processing...'
                    }
                  </div>
                  
                  {article.contentSentimentReason && (
                    <div className="bg-white dark:bg-gray-600 p-3 rounded-lg border-l-4 border-green-500">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        AI Reasoning:
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {article.contentSentimentReason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* File Viewer */}
        <FileViewer 
          article={article} 
          className="h-[700px]"
        />

        {/* Processing Error */}
        {article.processingStatus === 'failed' && article.errorMessage && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mt-8">
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
              Processing Error
            </h3>
            <p className="text-red-700 dark:text-red-300">
              {article.errorMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ArticleDetail
