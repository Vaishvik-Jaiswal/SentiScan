import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, Type, File, X, Loader, Eye, BarChart3, FileBarChart, Layers, Sparkles, Brain, Zap } from 'lucide-react'
import { articleAPI } from '../services/api'
import { toast } from 'react-toastify'

const Upload = () => {
  const [uploadMode, setUploadMode] = useState('file') // 'file' or 'text'
  const [file, setFile] = useState(null)
  const [textData, setTextData] = useState({ title: '', content: '', language: '' })
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [processingSteps, setProcessingSteps] = useState({
    upload: { status: 'pending', message: 'Preparing upload...' },
    extraction: { status: 'pending', message: 'Extracting text content...' },
    analysis: { status: 'pending', message: 'Analyzing sentiment...' },
    completion: { status: 'pending', message: 'Finalizing results...' }
  })
  const [currentStep, setCurrentStep] = useState('')
  const [articleId, setArticleId] = useState(null)
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

      // Reset progress and show modal
      setProcessingSteps({
        preparing: { status: 'pending', message: 'Preparing file for upload...' },
        uploading: { status: 'pending', message: 'Uploading to secure servers...' },
        processing: { status: 'pending', message: 'Processing file on server...' },
        extraction: { status: 'pending', message: 'Extracting text content...' },
        analysis: { status: 'pending', message: 'Analyzing sentiment...' },
        completion: { status: 'pending', message: 'Finalizing results...' }
      })
      setShowProgressModal(true)
      setUploading(true)

      try {
        // Step 1: Preparing
        updateProcessingStep('preparing', 'processing', 'Validating file and preparing for upload...')
        await new Promise(resolve => setTimeout(resolve, 800))
        updateProcessingStep('preparing', 'completed', 'File prepared successfully!')

        // Step 2: Uploading
        updateProcessingStep('uploading', 'processing', 'Uploading file to secure servers...')
        const result = await articleAPI.uploadArticle(file)
        updateProcessingStep('uploading', 'completed', 'File uploaded successfully!')
        setArticleId(result._id)

        // Step 3: Server Processing
        updateProcessingStep('processing', 'processing', 'Server is processing your file...')
        await new Promise(resolve => setTimeout(resolve, 1200))
        updateProcessingStep('processing', 'completed', 'Server processing completed!')

        // Step 4: Text Extraction
        updateProcessingStep('extraction', 'processing', 'Extracting text from document...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        updateProcessingStep('extraction', 'completed', 'Text extracted successfully!')

        // Step 5: Start sentiment analysis polling
        updateProcessingStep('analysis', 'processing', 'Starting AI sentiment analysis...')
        pollProcessingStatus(result._id)

      } catch (error) {
        console.error('Upload error:', error)
        // Determine which step failed and update accordingly
        const currentStep = Object.entries(processingSteps).find(([, { status }]) => status === 'processing')?.[0] || 'preparing'
        updateProcessingStep(currentStep, 'failed', error.response?.data?.message || 'Failed to process file')
        setTimeout(() => {
          setShowProgressModal(false)
          toast.error(error.response?.data?.message || 'Failed to upload file')
        }, 2000)
      } finally {
        setUploading(false)
      }
    } else {
      if (!textData.title || !textData.content) {
        toast.error('Please provide both title and content')
        return
      }

      // Reset progress and show modal
      setProcessingSteps({
        preparing: { status: 'pending', message: 'Preparing text content...' },
        uploading: { status: 'pending', message: 'Creating article...' },
        processing: { status: 'pending', message: 'Processing content...' },
        extraction: { status: 'pending', message: 'Text content ready!' },
        analysis: { status: 'pending', message: 'Analyzing sentiment...' },
        completion: { status: 'pending', message: 'Finalizing results...' }
      })
      setShowProgressModal(true)
      setUploading(true)

      try {
        // Step 1: Preparing
        updateProcessingStep('preparing', 'processing', 'Validating text content...')
        await new Promise(resolve => setTimeout(resolve, 600))
        updateProcessingStep('preparing', 'completed', 'Text content validated!')

        // Step 2: Creating article
        updateProcessingStep('uploading', 'processing', 'Creating article from text...')
        const result = await articleAPI.createFromText(textData.title, textData.content, textData.language)
        updateProcessingStep('uploading', 'completed', 'Article created successfully!')
        setArticleId(result._id)

        // Step 3: Processing
        updateProcessingStep('processing', 'processing', 'Processing article content...')
        await new Promise(resolve => setTimeout(resolve, 800))
        updateProcessingStep('processing', 'completed', 'Content processing completed!')

        // Step 4: Text ready (instant for text mode)
        updateProcessingStep('extraction', 'processing', 'Preparing text content...')
        await new Promise(resolve => setTimeout(resolve, 400))
        updateProcessingStep('extraction', 'completed', 'Text content ready!')

        // Step 5: Start sentiment analysis polling
        updateProcessingStep('analysis', 'processing', 'Starting AI sentiment analysis...')
        pollProcessingStatus(result._id)

      } catch (error) {
        console.error('Text upload error:', error)
        // Determine which step failed and update accordingly
        const currentStep = Object.entries(processingSteps).find(([, { status }]) => status === 'processing')?.[0] || 'preparing'
        updateProcessingStep(currentStep, 'failed', error.response?.data?.message || 'Failed to create article')
        setTimeout(() => {
          setShowProgressModal(false)
          toast.error(error.response?.data?.message || 'Failed to create article')
        }, 2000)
      } finally {
        setUploading(false)
      }
    }
  }

  const handleTextChange = (field, value) => {
    setTextData(prev => ({ ...prev, [field]: value }))
  }

  const updateProcessingStep = (step, status, message) => {
    setProcessingSteps(prev => ({
      ...prev,
      [step]: { status, message }
    }))
    setCurrentStep(step)
  }

  const pollProcessingStatus = async (articleId) => {
    const maxAttempts = 60 // 5 minutes with 5-second intervals
    let attempts = 0

    const poll = async () => {
      try {
        const article = await articleAPI.getArticleById(articleId)
        
        if (article.processingStatus === 'completed') {
          updateProcessingStep('completion', 'completed', 'Analysis completed successfully!')
          setTimeout(() => {
            setShowProgressModal(false)
            toast.success('Article analyzed successfully!')
            navigate(`/article/${articleId}`)
          }, 1500)
          return
        } else if (article.processingStatus === 'failed') {
          updateProcessingStep('completion', 'failed', 'Analysis failed. Please try again.')
          setTimeout(() => {
            setShowProgressModal(false)
            toast.error('Analysis failed. Please try again.')
          }, 2000)
          return
        } else if (article.processingStatus === 'processing') {
          updateProcessingStep('analysis', 'processing', 'AI is analyzing sentiment...')
        }

        // Continue polling if still processing
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000) // Poll every 5 seconds
        } else {
          // Timeout after 5 minutes
          updateProcessingStep('completion', 'failed', 'Processing timeout. Please check dashboard.')
          setTimeout(() => {
            setShowProgressModal(false)
            toast.warning('Processing is taking longer than expected. Check your dashboard for updates.')
            navigate('/dashboard')
          }, 2000)
        }
      } catch (error) {
        console.error('Error polling status:', error)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        } else {
          updateProcessingStep('completion', 'failed', 'Error checking status. Please check dashboard.')
          setTimeout(() => {
            setShowProgressModal(false)
            navigate('/dashboard')
          }, 2000)
        }
      }
    }

    // Start polling after a short delay
    setTimeout(poll, 2000)
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

  const getStepIcon = (step, status) => {
    const icons = {
      preparing: FileText,
      uploading: UploadIcon,
      processing: Eye,
      extraction: FileText,
      analysis: BarChart3,
      completion: CheckCircle
    }
    
    const IconComponent = icons[step] || FileText
    
    if (status === 'completed') {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    } else if (status === 'processing') {
      return <Loader className="h-5 w-5 text-blue-500 animate-spin" />
    } else if (status === 'failed') {
      return <AlertCircle className="h-5 w-5 text-red-500" />
    } else {
      return <IconComponent className="h-5 w-5 text-gray-400" />
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
                  <option value="telugu">Telugu</option>
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
                <li>• Text should be in English, Hindi, Gujarati or Telugu</li>
                <li>• Images will be processed using OCR (Optical Character Recognition)</li>
                <li>• Files will be processed for sentiment analysis using AI</li>
              </ul>
            ) : (
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Provide a clear title for your article</li>
                <li>• Content should be in English, Hindi, Gujarati or Telugu</li>
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
                  <li>1. Your file is securely stored</li>
                  <li>2. Text is extracted from the document</li>
                  <li>3. AI analyzes the sentiment of the heading and content</li>
                  <li>4. Results are displayed in your dashboard</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  {processingSteps.preparing?.status === 'active' && <FileBarChart className="h-8 w-8 text-white animate-pulse" />}
                  {processingSteps.uploading?.status === 'active' && <UploadIcon className="h-8 w-8 text-white animate-bounce" />}
                  {processingSteps.processing?.status === 'active' && <Layers className="h-8 w-8 text-white animate-spin" />}
                  {processingSteps.extraction?.status === 'active' && <FileText className="h-8 w-8 text-white animate-pulse" />}
                  {processingSteps.analysis?.status === 'active' && <Brain className="h-8 w-8 text-white animate-bounce" />}
                  {processingSteps.completion?.status === 'active' && <Sparkles className="h-8 w-8 text-white" />}
                  {!Object.values(processingSteps).some(step => step.status === 'active') && <BarChart3 className="h-8 w-8 text-white" />}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Processing Your Article
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Please wait while we analyze your content
                </p>
              </div>

              {/* Progress Steps */}
              <div className="space-y-4 mb-8">
                {Object.entries(processingSteps).map(([step, { status, message }]) => (
                  <div key={step} className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                    status === 'processing' ? 'bg-blue-50 dark:bg-blue-900/20' :
                    status === 'completed' ? 'bg-green-50 dark:bg-green-900/20' :
                    status === 'failed' ? 'bg-red-50 dark:bg-red-900/20' :
                    'bg-gray-50 dark:bg-gray-700'
                  }`}>
                    <div className="flex-shrink-0">
                      {getStepIcon(step, status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        status === 'processing' ? 'text-blue-700 dark:text-blue-300' :
                        status === 'completed' ? 'text-green-700 dark:text-green-300' :
                        status === 'failed' ? 'text-red-700 dark:text-red-300' :
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {message}
                      </p>
                    </div>
                    {status === 'completed' && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Current Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Progress</span>
                  <span>
                    {Object.values(processingSteps).filter(step => step.status === 'completed').length} / {Object.keys(processingSteps).length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(Object.values(processingSteps).filter(step => step.status === 'completed').length / Object.keys(processingSteps).length) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                {processingSteps.completion?.status === 'completed' && articleId && (
                  <button
                    onClick={() => {
                      setShowProgressModal(false)
                      navigate(`/article/${articleId}`)
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Results</span>
                  </button>
                )}
                
                {(processingSteps.completion?.status === 'failed' || Object.values(processingSteps).some(step => step.status === 'failed')) && (
                  <button
                    onClick={() => setShowProgressModal(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Close</span>
                  </button>
                )}
              </div>

              {/* Tips */}
              <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                  💡 <strong>Tip:</strong> Larger files may take longer to process. We'll notify you when it's ready!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Upload