import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, Type, File } from 'lucide-react'
import { articleAPI } from '../services/api'
import { toast } from 'react-toastify'

const Upload = () => {
  const [uploadMode, setUploadMode] = useState('file') // 'file' or 'text'
  const [file, setFile] = useState(null)
  const [textData, setTextData] = useState({ title: '', content: '', language: '' })
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const navigate = useNavigate()

  const allowedTypes = [
    'application/pdf', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'text/plain',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp'
  ]
  const maxSize = 10 * 1024 * 1024 // 10MB

  const validateFile = (selectedFile) => {
    if (!selectedFile) return false

    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Invalid file type. Only PDF, DOCX, TXT, and image files are allowed.')
      return false
    }

    if (selectedFile.size > maxSize) {
      toast.error('File size too large. Maximum size is 10MB.')
      return false
    }

    return true
  }

  const handleFileSelect = (selectedFile) => {
    if (validateFile(selectedFile)) {
      setFile(selectedFile)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    handleFileSelect(selectedFile)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const selectedFile = e.dataTransfer.files[0]
    handleFileSelect(selectedFile)
  }

  const handleUpload = async () => {
    if (uploadMode === 'file') {
      if (!file) {
        toast.error('Please select a file to upload')
        return
      }

      setUploading(true)
      try {
        const result = await articleAPI.uploadArticle(file)
        toast.success('File uploaded successfully! Processing sentiment analysis...')
        navigate('/dashboard')
      } catch (error) {
        console.error('Upload error:', error)
        toast.error(error.response?.data?.message || 'Failed to upload file')
      } finally {
        setUploading(false)
      }
    } else {
      if (!textData.title || !textData.content) {
        toast.error('Please provide both title and content')
        return
      }

      setUploading(true)
      try {
        const result = await articleAPI.createFromText(textData.title, textData.content, textData.language)
        toast.success('Article created successfully! Processing sentiment analysis...')
        navigate('/dashboard')
      } catch (error) {
        console.error('Text upload error:', error)
        toast.error(error.response?.data?.message || 'Failed to create article')
      } finally {
        setUploading(false)
      }
    }
  }

  const handleTextChange = (field, value) => {
    setTextData(prev => ({ ...prev, [field]: value }))
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type) => {
    switch (type) {
      case 'application/pdf':
        return '📄'
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return '📝'
      case 'text/plain':
        return '📄'
      case 'image/jpeg':
      case 'image/jpg':
      case 'image/png':
      case 'image/gif':
      case 'image/bmp':
      case 'image/webp':
        return '🖼️'
      default:
        return '📄'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Add Article for Analysis
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Upload a file or paste your text for sentiment analysis
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex">
              <button
                onClick={() => setUploadMode('file')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  uploadMode === 'file'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <File className="h-4 w-4" />
                <span>Upload File</span>
              </button>
              <button
                onClick={() => setUploadMode('text')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  uploadMode === 'text'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Type className="h-4 w-4" />
                <span>Paste Text</span>
              </button>
            </div>
          </div>

          {/* Content Area */}
          {uploadMode === 'file' ? (
            /* File Upload Area */
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
            {!file ? (
              <>
                <UploadIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    Drop your file here, or{' '}
                    <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
                      browse
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.gif,.bmp,.webp"
                        onChange={handleFileChange}
                      />
                    </label>
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Supports PDF, DOCX, TXT, and image files up to 10MB
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-3xl">{getFileIcon(file.type)}</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-sm text-red-600 hover:text-red-500"
                >
                  Remove file
                </button>
              </div>
            )}
            </div>
          ) : (
            /* Text Input Area */
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Article Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={textData.title}
                  onChange={(e) => handleTextChange('title', e.target.value)}
                  placeholder="Enter the article title or headline"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Language (Optional)
                </label>
                <select
                  id="language"
                  value={textData.language}
                  onChange={(e) => handleTextChange('language', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Auto-detect language</option>
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                  <option value="gujarati">Gujarati</option>
                </select>
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Article Content *
                </label>
                <textarea
                  id="content"
                  value={textData.content}
                  onChange={(e) => handleTextChange('content', e.target.value)}
                  placeholder="Paste your article content here..."
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-vertical"
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Characters: {textData.content.length}
                </p>
              </div>
            </div>
          )}

          {/* Requirements */}
          <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              {uploadMode === 'file' ? 'File Requirements:' : 'Text Requirements:'}
            </h3>
            {uploadMode === 'file' ? (
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Supported formats: PDF, DOCX, TXT, JPG, PNG, GIF, BMP, WebP</li>
                <li>• Maximum file size: 10MB</li>
                <li>• Text should be in English, Hindi, or Gujarati</li>
                <li>• Images will be processed using OCR (Optical Character Recognition)</li>
                <li>• Files will be processed for sentiment analysis using AI</li>
              </ul>
            ) : (
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Provide a clear title for your article</li>
                <li>• Content should be in English, Hindi, or Gujarati</li>
                <li>• Minimum 50 characters recommended for accurate analysis</li>
                <li>• Text will be processed for sentiment analysis using AI</li>
              </ul>
            )}
          </div>

          {/* Upload Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleUpload}
              disabled={
                (uploadMode === 'file' && !file) || 
                (uploadMode === 'text' && (!textData.title || !textData.content)) || 
                uploading
              }
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{uploadMode === 'file' ? 'Uploading...' : 'Creating...'}</span>
                </>
              ) : (
                <>
                  {uploadMode === 'file' ? <UploadIcon className="h-4 w-4" /> : <Type className="h-4 w-4" />}
                  <span>{uploadMode === 'file' ? 'Upload & Analyze' : 'Create & Analyze'}</span>
                </>
              )}
            </button>
          </div>

          {/* Processing Info */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">What happens after upload:</p>
                <ul className="space-y-1">
                  <li>1. Your file is securely stored in Azure Blob Storage</li>
                  <li>2. Text is extracted from the document</li>
                  <li>3. AI analyzes the sentiment of the heading and content</li>
                  <li>4. Results are displayed in your dashboard</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Upload
