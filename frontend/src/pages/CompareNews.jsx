import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { 
  Plus, 
  Upload as UploadIcon, 
  FileText, 
  Newspaper, 
  BarChart3, 
  AlertCircle, 
  CheckCircle, 
  Loader, 
  X, 
  Eye,
  Trash2,
  ArrowRight,
  TrendingUp,
  Users,
  Target,
  Upload
} from 'lucide-react'
import { toast } from 'react-toastify'
import { newsComparisonAPI, articleAPI } from '../services/api'

export default function CompareNews() {
  const [step, setStep] = useState(1) // 1: Setup, 2: Upload Articles, 3: Results
  const [comparisonData, setComparisonData] = useState({
    title: '',
    description: '',
    articleCount: 2,
  })
  const [currentComparison, setCurrentComparison] = useState(null)
  const [uploadedArticles, setUploadedArticles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [comparisons, setComparisons] = useState([])
  const [loadingComparisons, setLoadingComparisons] = useState(true)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [processingSteps, setProcessingSteps] = useState({
    upload: { status: 'pending', message: 'Preparing upload...' },
    extraction: { status: 'pending', message: 'Extracting text content...' },
    analysis: { status: 'pending', message: 'Analyzing sentiment...' },
    completion: { status: 'pending', message: 'Adding to comparison...' }
  })
  const [currentProcessingArticle, setCurrentProcessingArticle] = useState('')
  const navigate = useNavigate()
  const { id } = useParams()

  useEffect(() => {
    fetchUserComparisons()
    
    // If there's an ID in the URL, load that specific comparison
    if (id) {
      loadSpecificComparison(id)
    }
  }, [id])

  const fetchUserComparisons = async () => {
    try {
      const data = await newsComparisonAPI.getUserComparisons()
      setComparisons(data.comparisons || [])
    } catch (error) {
      console.error('Error fetching comparisons:', error)
    } finally {
      setLoadingComparisons(false)
    }
  }

  const loadSpecificComparison = async (comparisonId) => {
    try {
      const comparison = await newsComparisonAPI.getComparison(comparisonId)
      setCurrentComparison(comparison)
      setUploadedArticles(comparison.articles || [])
      
      // Determine which step to show based on comparison status
      if (comparison.processingStatus === 'completed') {
        setStep(3) // Show results
      } else if (comparison.articles && comparison.articles.length > 0) {
        setStep(2) // Show upload step with existing articles
      } else {
        setStep(1) // Show setup step
      }
      
      // Set comparison data for display
      setComparisonData({
        title: comparison.comparisonTitle,
        description: comparison.description || '',
        articleCount: comparison.articles?.length || 2,
      })
    } catch (error) {
      console.error('Error loading comparison:', error)
      toast.error('Failed to load comparison')
      navigate('/compare-news')
    }
  }

  const handleCreateComparison = async () => {
    if (!comparisonData.title.trim()) {
      toast.error('Please enter a comparison title')
      return
    }

    if (comparisonData.articleCount < 2 || comparisonData.articleCount > 10) {
      toast.error('Please select between 2-10 articles')
      return
    }

    try {
      const payload = {
        comparisonTitle: comparisonData.title,
        description: comparisonData.description,
        articleCount: comparisonData.articleCount
      }
      console.log('Creating comparison with payload:', payload)
      const result = await newsComparisonAPI.createComparison(payload)
      setCurrentComparison(result)
      setStep(2)
      toast.success('Comparison created! Now upload your news articles.')
    } catch (error) {
      console.error('Error creating comparison:', error)
      toast.error(error.response?.data?.message || 'Failed to create comparison')
    }
  }

  const updateProcessingStep = (step, status, message) => {
    setProcessingSteps(prev => ({
      ...prev,
      [step]: { status, message }
    }))
  }

  const getStepIcon = (step, status) => {
    const icons = {
      upload: UploadIcon,
      extraction: FileText,
      analysis: BarChart3,
      completion: CheckCircle
    }
    
    const IconComponent = icons[step]
    
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

  const handleAddArticle = async (file, newspaperName) => {
    if (!newspaperName.trim()) {
      toast.error('Please enter a newspaper name')
      return
    }

    try {
      setUploading(true)
      setCurrentProcessingArticle(newspaperName)
      
      // Reset progress and show modal
      setProcessingSteps({
        upload: { status: 'pending', message: 'Preparing upload...' },
        extraction: { status: 'pending', message: 'Extracting text content...' },
        analysis: { status: 'pending', message: 'Analyzing sentiment...' },
        completion: { status: 'pending', message: 'Adding to comparison...' }
      })
      setShowProgressModal(true)

      // Step 1: Upload
      updateProcessingStep('upload', 'processing', 'Uploading file to server...')
      const uploadResult = await articleAPI.uploadArticle(file)
      updateProcessingStep('upload', 'completed', 'File uploaded successfully!')

      // Step 2: Text Extraction (simulated delay for user experience)
      updateProcessingStep('extraction', 'processing', 'Extracting text from document...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      updateProcessingStep('extraction', 'completed', 'Text extracted successfully!')

      // Step 3: Add to comparison
      updateProcessingStep('completion', 'processing', 'Adding to comparison...')
      const result = await newsComparisonAPI.addArticle(currentComparison._id, {
        articleId: uploadResult._id,
        newspaperName: newspaperName.trim(),
      })
      
      setCurrentComparison(result)
      setUploadedArticles(result.articles || [])
      updateProcessingStep('completion', 'completed', 'Added to comparison successfully!')

      // Step 4: Start sentiment analysis polling
      updateProcessingStep('analysis', 'processing', 'Starting AI sentiment analysis...')
      pollArticleProcessingWithModal(uploadResult._id, newspaperName)
      
    } catch (error) {
      console.error('Error adding article:', error)
      updateProcessingStep('upload', 'failed', error.response?.data?.message || 'Failed to upload file')
      setTimeout(() => {
        setShowProgressModal(false)
        toast.error(error.response?.data?.message || 'Failed to add article')
      }, 2000)
    } finally {
      setUploading(false)
    }
  }

  const pollArticleProcessing = async (articleId) => {
    const maxAttempts = 30 // 2.5 minutes
    let attempts = 0

    const poll = async () => {
      try {
        const article = await articleAPI.getArticleById(articleId)
        
        if (article.processingStatus === 'completed') {
          // Update the comparison to reflect the processed article
          const updatedComparison = await newsComparisonAPI.getComparison(currentComparison._id)
          setCurrentComparison(updatedComparison)
          setUploadedArticles(updatedComparison.articles || [])
          toast.success(`Sentiment analysis completed for ${article.originalName}`)
          return
        } else if (article.processingStatus === 'failed') {
          toast.error(`Processing failed for article: ${article.originalName}`)
          return
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000) // Poll every 5 seconds
        } else {
          toast.warning('Article processing is taking longer than expected')
        }
      } catch (error) {
        console.error('Error polling article status:', error)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        }
      }
    }

    setTimeout(poll, 3000) // Start polling after 3 seconds
  }

  const pollArticleProcessingWithModal = async (articleId, newspaperName) => {
    const maxAttempts = 60 // 5 minutes
    let attempts = 0

    const poll = async () => {
      try {
        const article = await articleAPI.getArticleById(articleId)
        
        if (article.processingStatus === 'completed') {
          updateProcessingStep('analysis', 'completed', 'Sentiment analysis completed!')
          
          // Update the comparison to reflect the processed article
          const updatedComparison = await newsComparisonAPI.getComparison(currentComparison._id)
          setCurrentComparison(updatedComparison)
          setUploadedArticles(updatedComparison.articles || [])
          
          setTimeout(() => {
            setShowProgressModal(false)
            toast.success(`Article from ${newspaperName} processed successfully!`)
            
            // Check if we have all articles processed
            const allProcessed = updatedComparison.articles.every(a => a.sentiment)
            if (allProcessed && updatedComparison.articles.length >= 2) {
              toast.info('All articles processed! Ready to analyze.')
            }
          }, 1500)
          return
        } else if (article.processingStatus === 'failed') {
          updateProcessingStep('analysis', 'failed', 'Sentiment analysis failed')
          setTimeout(() => {
            setShowProgressModal(false)
            toast.error(`Processing failed for ${newspaperName}`)
          }, 2000)
          return
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000) // Poll every 5 seconds
        } else {
          updateProcessingStep('analysis', 'failed', 'Processing timeout')
          setTimeout(() => {
            setShowProgressModal(false)
            toast.warning('Processing is taking longer than expected')
          }, 2000)
        }
      } catch (error) {
        console.error('Error polling article status:', error)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        } else {
          setTimeout(() => {
            setShowProgressModal(false)
          }, 2000)
        }
      }
    }

    setTimeout(poll, 3000) // Start polling after 3 seconds
  }

  const refreshComparisonData = async () => {
    if (currentComparison) {
      try {
        const updatedComparison = await newsComparisonAPI.getComparison(currentComparison._id)
        setCurrentComparison(updatedComparison)
        setUploadedArticles(updatedComparison.articles || [])
      } catch (error) {
        console.error('Error refreshing comparison data:', error)
      }
    }
  }

  const handleDeleteComparisonFromList = async (comparisonId) => {
    if (!window.confirm('Are you sure you want to delete this comparison? This action cannot be undone.')) {
      return
    }

    try {
      await newsComparisonAPI.deleteComparison(comparisonId)
      toast.success('Comparison deleted successfully')
      
      // Remove from local state
      setComparisons(prev => prev.filter(comp => comp._id !== comparisonId))
      
      // If the deleted comparison is currently loaded, reset to step 1
      if (currentComparison && currentComparison._id === comparisonId) {
        resetComparison()
        navigate('/compare-news')
      }
    } catch (error) {
      console.error('Error deleting comparison:', error)
      toast.error('Failed to delete comparison')
    }
  }

  const handleStartAnalysis = async () => {
    if (!currentComparison || uploadedArticles.length < 2) {
      toast.error('Need at least 2 articles to start analysis')
      return
    }

    try {
      setAnalyzing(true)
      await newsComparisonAPI.startAnalysis(currentComparison._id)
      
      // Poll for results
      pollAnalysisStatus()
    } catch (error) {
      console.error('Error starting analysis:', error)
      toast.error(error.response?.data?.message || 'Failed to start analysis')
      setAnalyzing(false)
    }
  }

  const pollAnalysisStatus = async () => {
    const maxAttempts = 60 // 5 minutes
    let attempts = 0

    const poll = async () => {
      try {
        const result = await newsComparisonAPI.getComparison(currentComparison._id)
        
        if (result.processingStatus === 'completed') {
          setCurrentComparison(result)
          setStep(3)
          setAnalyzing(false)
          toast.success('Analysis completed!')
          return
        } else if (result.processingStatus === 'failed') {
          setAnalyzing(false)
          toast.error('Analysis failed. Please try again.')
          return
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000) // Poll every 5 seconds
        } else {
          setAnalyzing(false)
          toast.warning('Analysis is taking longer than expected. Please check back later.')
        }
      } catch (error) {
        console.error('Error polling analysis status:', error)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        } else {
          setAnalyzing(false)
          toast.error('Error checking analysis status')
        }
      }
    }

    setTimeout(poll, 2000)
  }

  const resetComparison = () => {
    setStep(1)
    setCurrentComparison(null)
    setUploadedArticles([])
    setComparisonData({ title: '', description: '', articleCount: 2 })
    setAnalyzing(false)
    fetchUserComparisons() // Refresh the list
    
    // Navigate to main compare news page if we're on a specific comparison
    if (id) {
      navigate('/compare-news')
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

  const renderContent = () => {
    if (step === 1) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-10 dark:opacity-20"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                  <Newspaper className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    Compare News
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                    Analyze how different newspapers present the same news story
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                <div className="text-center p-4">
                  <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <UploadIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Upload Files</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Upload articles from different newspapers</p>
                </div>
                <div className="text-center p-4">
                  <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Eye className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">OCR & Extract</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Extract text from documents & images</p>
                </div>
                <div className="text-center p-4">
                  <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">AI Analysis</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Sentiment analysis & comparison</p>
                </div>
                <div className="text-center p-4">
                  <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Get Report</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Detailed comparison insights</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Create New Comparison */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <Plus className="h-6 w-6 mr-2 text-blue-600" />
                Start New Comparison
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Comparison Title *
                  </label>
                  <input
                    type="text"
                    value={comparisonData.title}
                    onChange={(e) => setComparisonData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Election Results Coverage, COVID-19 Response Analysis"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={comparisonData.description}
                    onChange={(e) => setComparisonData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of what you're comparing..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-vertical"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Articles (2-10)
                  </label>
                  <select
                    value={comparisonData.articleCount}
                    onChange={(e) => setComparisonData(prev => ({ ...prev, articleCount: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {[2,3,4,5,6,7,8,9,10].map(num => (
                      <option key={num} value={num}>{num} articles</option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium mb-2">Tips for best results:</p>
                      <ul className="space-y-1 text-sm">
                        <li>• Upload articles about the same news event</li>
                        <li>• Use articles from different newspapers</li>
                        <li>• Ensure articles are in supported languages</li>
                        <li>• Articles should be recent and relevant</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateComparison}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <ArrowRight className="h-5 w-5" />
                  <span>Create Comparison</span>
                </button>
              </div>
            </div>

            {/* Previous Comparisons */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <BarChart3 className="h-6 w-6 mr-2 text-purple-600" />
                Previous Comparisons
              </h2>

              {loadingComparisons ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : comparisons.length > 0 ? (
                <div className="space-y-4">
                  {comparisons.slice(0, 5).map((comparison) => (
                    <div key={comparison._id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                            {comparison.comparisonTitle}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center">
                              <Newspaper className="h-4 w-4 mr-1" />
                              {comparison.articles?.length || 0} articles
                            </span>
                            <span className="flex items-center">
                              <Target className="h-4 w-4 mr-1" />
                              {comparison.processingStatus}
                            </span>
                            <span className="text-xs">
                              {new Date(comparison.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/compare-news/${comparison._id}`}
                            className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 p-2 rounded-lg transition-colors"
                            title="View comparison"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteComparisonFromList(comparison._id)}
                            className="bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 p-2 rounded-lg transition-colors"
                            title="Delete comparison"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {comparisons.length > 5 && (
                    <div className="text-center pt-4">
                      <Link 
                        to="/compare-news/history"
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View all comparisons →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Newspaper className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No comparisons yet</p>
                  <p className="text-sm text-gray-400">Create your first comparison to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )
    }

    if (step === 2) {
      return (
        <ArticleUploadStep
        currentComparison={currentComparison}
        comparisonData={comparisonData}
        uploadedArticles={uploadedArticles}
        uploading={uploading}
        analyzing={analyzing}
        onAddArticle={handleAddArticle}
        onStartAnalysis={handleStartAnalysis}
        onBack={resetComparison}
        onRefresh={refreshComparisonData}
        getSentimentColor={getSentimentColor}
      />
      )
    }

    if (step === 3) {
      return (
        <ComparisonResults
          comparison={currentComparison}
          onStartNew={resetComparison}
          getSentimentColor={getSentimentColor}
        />
      )
    }

    return null
  }

  return (
    <div>
      {renderContent()}
      
      {/* Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="bg-blue-100 dark:bg-blue-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Processing Article
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Adding {currentProcessingArticle} to comparison
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

              {/* Tips */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                  💡 <strong>Tip:</strong> The article will be automatically added to your comparison once processing is complete!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Article Upload Step Component
function ArticleUploadStep({ 
  currentComparison, 
  comparisonData, 
  uploadedArticles, 
  uploading, 
  analyzing,
  onAddArticle, 
  onStartAnalysis, 
  onBack,
  onRefresh,
  getSentimentColor 
}) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [newspaperName, setNewspaperName] = useState('')
  const [dragOver, setDragOver] = useState(false)

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

  const validateFile = (file) => {
    if (!file) return false

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only PDF, DOCX, TXT, and image files are allowed.')
      return false
    }

    if (file.size > maxSize) {
      toast.error('File size too large. Maximum size is 10MB.')
      return false
    }

    return true
  }

  const handleFileSelect = (file) => {
    if (validateFile(file)) {
      setSelectedFile(file)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
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

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleUploadClick = () => {
    if (!selectedFile || !newspaperName.trim()) {
      toast.error('Please select a file and enter newspaper name')
      return
    }

    onAddArticle(selectedFile, newspaperName)
    setSelectedFile(null)
    setNewspaperName('')
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

  const canStartAnalysis = uploadedArticles.length >= 2 && uploadedArticles.every(article => article.sentiment)
  const isComplete = uploadedArticles.length >= comparisonData.articleCount
  const allProcessed = uploadedArticles.every(article => article.sentiment)
  const processingCount = uploadedArticles.filter(article => !article.sentiment).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="relative mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {currentComparison.comparisonTitle}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Upload articles from different newspapers ({uploadedArticles.length}/{comparisonData.articleCount})
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={onRefresh}
                  className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                  title="Refresh sentiment data"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={onBack}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg transition-colors"
                >
                  ← Back
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <Plus className="h-5 w-5 mr-2 text-blue-600" />
              Add Article
            </h2>

            <div className="space-y-6">
              {/* File Upload Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload Article File
                </label>
                <div
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                    dragOver
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {!selectedFile ? (
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
                        <span className="text-3xl">{getFileIcon(selectedFile.type)}</span>
                        <div className="text-left">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {selectedFile.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-sm text-red-600 hover:text-red-500"
                      >
                        Remove file
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Newspaper Name
                </label>
                <input
                  type="text"
                  value={newspaperName}
                  onChange={(e) => setNewspaperName(e.target.value)}
                  placeholder="e.g., The Times, CNN, BBC News"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <button
                onClick={handleUploadClick}
                disabled={uploading || !selectedFile || !newspaperName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                {uploading ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Uploading & Processing...</span>
                  </>
                ) : (
                  <>
                    <UploadIcon className="h-5 w-5" />
                    <span>Upload & Process Article</span>
                  </>
                )}
              </button>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-2">What happens after upload:</p>
                    <ul className="space-y-1 text-sm">
                      <li>• File is uploaded and text is extracted (OCR for images)</li>
                      <li>• AI performs sentiment analysis on the content</li>
                      <li>• Article is added to your comparison</li>
                      <li>• Process repeats for each newspaper</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Uploaded Articles */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <Newspaper className="h-5 w-5 mr-2 text-purple-600" />
              Uploaded Articles
            </h2>

            {uploadedArticles.length > 0 ? (
              <div className="space-y-4 mb-6">
                {uploadedArticles.map((article, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {article.newspaperName}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            #{article.uploadOrder}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {article.headline || 'Processing headline...'}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          {article.sentiment ? (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSentimentColor(article.sentiment)}`}>
                              {article.sentiment}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                              <Loader className="h-3 w-3 mr-1 animate-spin" />
                              Processing...
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {article.articleId && (
                          <Link
                            to={`/article/${typeof article.articleId === 'object' ? article.articleId._id : article.articleId}`}
                            className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 p-2 rounded-lg transition-colors"
                            title="View detailed analysis"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        )}
                        {article.sentiment ? (
                          <CheckCircle className="h-6 w-6 text-green-500" />
                        ) : (
                          <Loader className="h-6 w-6 text-blue-500 animate-spin" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 mb-6">
                <Newspaper className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No articles uploaded yet</p>
                <p className="text-sm text-gray-400 mt-1">Upload articles from different newspapers covering the same news</p>
              </div>
            )}

            {/* Processing Status */}
            {uploadedArticles.length > 0 && processingCount > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <Loader className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                    Processing {processingCount} article{processingCount > 1 ? 's' : ''}... Please wait for sentiment analysis to complete.
                  </p>
                </div>
              </div>
            )}

            {canStartAnalysis && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                      {isComplete && allProcessed ? 'All articles processed!' : `${uploadedArticles.length} articles ready.`} Ready to analyze.
                    </p>
                  </div>
                </div>

                <button
                  onClick={onStartAnalysis}
                  disabled={analyzing}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                  {analyzing ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-5 w-5" />
                      <span>Start Comparison Analysis</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Upload more articles hint */}
            {uploadedArticles.length > 0 && uploadedArticles.length < comparisonData.articleCount && allProcessed && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    You can upload {comparisonData.articleCount - uploadedArticles.length} more article{comparisonData.articleCount - uploadedArticles.length > 1 ? 's' : ''} to start analysis.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Comparison Results Component
function ComparisonResults({ comparison, onStartNew, getSentimentColor }) {
  const navigate = useNavigate()
  const report = comparison.compiledReport

  const handleDeleteComparison = async () => {
    try {
      await newsComparisonAPI.deleteComparison(comparison._id)
      toast.success('Comparison deleted successfully')
      // Use window.location to ensure clean navigation
      window.location.href = '/compare-news'
    } catch (error) {
      console.error('Error deleting comparison:', error)
      toast.error('Failed to delete comparison')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="relative mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {comparison.comparisonTitle}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Analysis completed • {comparison.articles?.length} newspapers compared
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this comparison?')) {
                      handleDeleteComparison()
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </button>
                {/* <button
                  onClick={() => navigate('/compare-news')}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg transition-colors"
                >
                  ← Back to List
                </button> */}
                <button
                  onClick={onStartNew}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Start New Comparison
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Similarity Score</h3>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {comparison.overallAnalysis?.similarityScore || 0}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {comparison.overallAnalysis?.isSameNews ? 'Same news story' : 'Different perspectives'}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Average Sentiment</h3>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full mt-2 ${getSentimentColor(comparison.sentimentSummary?.averageSentiment)}`}>
                {comparison.sentimentSummary?.averageSentiment || 'Neutral'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Newspapers</h3>
              <p className="text-2xl font-bold text-purple-600 mt-2">
                {comparison.articles?.length || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Sources analyzed
              </p>
            </div>
          </div>
        </div>

        {/* Warnings for mismatched articles */}
        {comparison.overallAnalysis?.mismatchWarnings && comparison.overallAnalysis.mismatchWarnings.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl shadow-xl border border-yellow-200/50 dark:border-yellow-700/50 p-6 mb-8">
            <h2 className="text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-4 flex items-center">
              <AlertCircle className="h-6 w-6 mr-2" />
              Quality Warnings
            </h2>
            <div className="space-y-2">
              {comparison.overallAnalysis.mismatchWarnings.map((warning, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">{warning}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                <strong>Note:</strong> These warnings indicate potential issues with the comparison. 
                Results may be less reliable if articles are about different topics or events.
              </p>
            </div>
          </div>
        )}

        {/* Report Summary */}
        {report?.summary && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <FileText className="h-6 w-6 mr-2 text-blue-600" />
              Analysis Summary
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {report.summary}
            </p>
            
            {/* Quality Metrics */}
            {comparison.overallAnalysis?.qualityMetrics && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Common Keywords</h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {comparison.overallAnalysis.qualityMetrics.keywordOverlap || 0}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Content Length</h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {comparison.overallAnalysis.qualityMetrics.contentLength ? 
                      Math.round(comparison.overallAnalysis.qualityMetrics.contentLength.reduce((a, b) => a + b, 0) / comparison.overallAnalysis.qualityMetrics.contentLength.length) : 0}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Newspaper Analysis */}
        {report?.newspaperAnalysis && report.newspaperAnalysis.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <Newspaper className="h-6 w-6 mr-2 text-purple-600" />
              Newspaper Analysis
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {report.newspaperAnalysis.map((analysis, index) => {
                const correspondingArticle = comparison.articles?.find(a => a.newspaperName === analysis.newspaper)
                return (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {analysis.newspaper}
                      </h3>
                      {correspondingArticle?.articleId && (
                        <Link
                          to={`/article/${typeof correspondingArticle.articleId === 'object' ? correspondingArticle.articleId._id : correspondingArticle.articleId}`}
                          className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 p-2 rounded-lg transition-colors"
                          title="View detailed analysis"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Perspective:</span>
                        <p className="text-gray-900 dark:text-white">{analysis.perspective}</p>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Bias Assessment:</span>
                        <p className="text-gray-900 dark:text-white">{analysis.bias}</p>
                      </div>
                      
                      {(correspondingArticle?.headingSentiment || correspondingArticle?.contentSentiment) && (
                        <div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Sentiment Analysis:</span>
                          <div className="mt-1 space-y-1">
                            {correspondingArticle?.headingSentiment && (
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Headline:</span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSentimentColor(correspondingArticle.headingSentiment)}`}>
                                  {correspondingArticle.headingSentiment}
                                </span>
                              </div>
                            )}
                            {correspondingArticle?.contentSentiment && (
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Content:</span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSentimentColor(correspondingArticle.contentSentiment)}`}>
                                  {correspondingArticle.contentSentiment}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {analysis.keyPoints && analysis.keyPoints.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Key Points:</span>
                          <ul className="mt-1 space-y-1">
                            {analysis.keyPoints.map((point, pointIndex) => (
                              <li key={pointIndex} className="text-sm text-gray-700 dark:text-gray-300">
                                • {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* AI Remarks */}
        {report?.aiRemarks && (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 rounded-2xl shadow-xl border border-purple-200/50 dark:border-purple-700/50 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <BarChart3 className="h-6 w-6 mr-2 text-purple-600" />
              AI Analysis & Insights
            </h2>
            
            <div className="space-y-6">
              {/* Overall Assessment */}
              {report.aiRemarks.overallAssessment && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-purple-200/30 dark:border-purple-700/30">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-purple-600" />
                    Overall Assessment
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {report.aiRemarks.overallAssessment}
                  </p>
                </div>
              )}

              {/* Sentiment Analysis */}
              {report.aiRemarks.sentimentAnalysis && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-blue-200/30 dark:border-blue-700/30">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                    Sentiment Analysis
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {report.aiRemarks.sentimentAnalysis}
                  </p>
                </div>
              )}

              {/* Bias Detection */}
              {report.aiRemarks.biasDetection && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-yellow-200/30 dark:border-yellow-700/30">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-yellow-600" />
                    Bias Detection
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {report.aiRemarks.biasDetection}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Key Insights */}
                {report.aiRemarks.keyInsights && report.aiRemarks.keyInsights.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-green-200/30 dark:border-green-700/30">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <Eye className="h-5 w-5 mr-2 text-green-600" />
                      Key Insights
                    </h3>
                    <ul className="space-y-2">
                      {report.aiRemarks.keyInsights.map((insight, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <div className="bg-green-100 dark:bg-green-900/20 p-1 rounded-full mt-1 flex-shrink-0">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          </div>
                          <span className="text-gray-700 dark:text-gray-300 text-sm">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {report.aiRemarks.recommendations && report.aiRemarks.recommendations.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-orange-200/30 dark:border-orange-700/30">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <Users className="h-5 w-5 mr-2 text-orange-600" />
                      Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {report.aiRemarks.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <div className="bg-orange-100 dark:bg-orange-900/20 p-1 rounded-full mt-1 flex-shrink-0">
                            <ArrowRight className="h-3 w-3 text-orange-600" />
                          </div>
                          <span className="text-gray-700 dark:text-gray-300 text-sm">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Conclusions */}
        {report?.conclusions && report.conclusions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <CheckCircle className="h-6 w-6 mr-2 text-green-600" />
              Key Conclusions
            </h2>
            
            <div className="space-y-3">
              {report.conclusions.map((conclusion, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="bg-green-100 dark:bg-green-900/20 p-1 rounded-full mt-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{conclusion}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
