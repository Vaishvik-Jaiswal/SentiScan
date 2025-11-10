import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Upload, 
  FileText, 
  Calendar, 
  Newspaper,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
  Eye,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react'
import { toast } from 'react-toastify'
import { newspaperAPI } from '../services/api'
import UploadModal from '../components/UploadModal'

const NewspaperUpload = () => {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState(null)
  const [newspaperName, setNewspaperName] = useState('')
  const [publicationDate, setPublicationDate] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newspapers, setNewspapers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNewspapers()
  }, [])

  const fetchNewspapers = async () => {
    try {
      const data = await newspaperAPI.getUserNewspapers()
      setNewspapers(data.newspapers || [])
    } catch (error) {
      console.error('Error fetching newspapers:', error)
      toast.error('Failed to load newspapers')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (file) => {
    if (file && file.type === 'application/pdf') {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error('File size must be less than 50MB')
        return
      }
      setSelectedFile(file)
    } else {
      toast.error('Please select a PDF file')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    handleFileSelect(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || !newspaperName.trim()) {
      toast.error('Please select a file and enter newspaper name')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('newspaper', selectedFile)
      formData.append('newspaperName', newspaperName.trim())
      if (publicationDate) {
        formData.append('publicationDate', publicationDate)
      }

      const data = await newspaperAPI.uploadNewspaper(formData)
      toast.success('Newspaper uploaded successfully! Redirecting to analysis page...')
      
      // Reset form
      setSelectedFile(null)
      setNewspaperName('')
      setPublicationDate('')
      
      // Refresh newspapers list
      fetchNewspapers()
      
      // Navigate immediately to show processing progress
      navigate(`/newspaper/${data._id}`)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload newspaper')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (newspaperId) => {
    if (!window.confirm('Are you sure you want to delete this newspaper analysis?')) {
      return
    }

    try {
      await newspaperAPI.deleteNewspaper(newspaperId)
      toast.success('Newspaper deleted successfully')
      fetchNewspapers()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete newspaper')
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

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Analysis Complete'
      case 'processing':
        return 'Analyzing...'
      case 'failed':
        return 'Analysis Failed'
      default:
        return 'Pending'
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
              <Newspaper className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Newspaper Analysis
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                Upload and analyze entire newspapers with AI-powered sentiment analysis
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <Upload className="h-6 w-6 mr-3 text-blue-600" />
              Upload Newspaper
            </h2>

            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                dragOver
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : selectedFile
                  ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {selectedFile ? (
                <div className="space-y-4">
                  <FileText className="h-16 w-16 text-green-500 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-16 w-16 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">
                      Drop your newspaper PDF here
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      or click to browse files
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </label>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Newspaper Name *
                </label>
                <input
                  type="text"
                  value={newspaperName}
                  onChange={(e) => setNewspaperName(e.target.value)}
                  placeholder="e.g., The Times of India, Gujarat Samachar"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Publication Date (Optional)
                </label>
                <input
                  type="date"
                  value={publicationDate}
                  onChange={(e) => setPublicationDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || !newspaperName.trim() || uploading}
              className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center justify-center"
            >
              {uploading ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Uploading & Starting Analysis...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Start Analysis
                </>
              )}
            </button>

            {/* Upload Progress Info */}
            {uploading && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center">
                  <RefreshCw className="h-5 w-5 text-blue-500 animate-spin mr-3" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200">
                      Uploading your newspaper...
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      This may take a few moments depending on file size. Analysis will begin automatically after upload.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Supported:</strong> PDF files up to 50MB in English, Hindi, or Gujarati
              </p>
            </div>
          </div>

          {/* Recent Newspapers */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <BarChart3 className="h-6 w-6 mr-3 text-green-600" />
                Recent Analysis
              </h2>
              <button
                onClick={fetchNewspapers}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : newspapers.length === 0 ? (
              <div className="text-center py-8">
                <Newspaper className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No newspapers analyzed yet. Upload your first newspaper to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {newspapers.map((newspaper) => (
                  <div
                    key={newspaper._id}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {newspaper.newspaperName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {newspaper.totalArticles} articles • {formatFileSize(newspaper.fileSize)}
                        </p>
                        <div className="flex items-center mt-2 space-x-4">
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(newspaper.processingStatus)}
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {getStatusText(newspaper.processingStatus)}
                            </span>
                          </div>
                          {newspaper.processingStatus === 'completed' && (
                            <div className="flex items-center space-x-1">
                              <div className={`w-3 h-3 rounded-full ${
                                newspaper.overallSentiment === 'Positive' ? 'bg-green-500' :
                                newspaper.overallSentiment === 'Negative' ? 'bg-red-500' :
                                'bg-gray-400'
                              }`}></div>
                              <span className="text-sm text-gray-600 dark:text-gray-300">
                                {newspaper.overallSentiment}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {newspaper.processingStatus === 'completed' && (
                          <>
                            <button
                              onClick={() => navigate(`/newspaper/${newspaper._id}`)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="View Analysis"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
                                window.open(`${API_BASE_URL}/api/newspaper/${newspaper._id}/pdf-report`, '_blank')
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title="Download Report"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(newspaper._id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal 
        isOpen={uploading}
        fileName={selectedFile?.name}
        fileSize={selectedFile?.size}
      />
    </div>
  )
}

export default NewspaperUpload
