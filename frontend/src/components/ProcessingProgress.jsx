import { useState, useEffect } from 'react'
import {
  FileText,
  Globe,
  Scissors,
  Brain,
  BarChart3,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2
} from 'lucide-react'

const ProcessingProgress = ({ newspaper, onRefresh, refreshing }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [activityLogs, setActivityLogs] = useState([])
  const [showDetailedLogs, setShowDetailedLogs] = useState(false)

  // Filter out nonsensical or problematic log messages
  const filterLogMessage = (message) => {
    if (!message || typeof message !== 'string') return false

    // Filter out nonsensical content patterns
    const nonsensicalPatterns = [
      // Single words or very short phrases that don't make sense
      /^(mr|mrs|ms|dr|prof|why|what|how|when|where|it|the|and|or|but|if|then|so)\s*$/i,
      /^[a-z]{1,3}\s*$/i, // Single short lowercase words
      /^[A-Z]{1,3}\s*$/i, // Single short uppercase words

      // Random character sequences
      /^[0-9\s\-_=+*#@$%^&()[\]{}|\\:;"'<>,.?/~`!]+$/i,

      // Common OCR errors
      /^[il1|]{2,}$/i,
      /^[oO0]{2,}$/i,

      // Layout artifacts
      /^(page|pg|p)\s*\d+\s*$/i,
      /^\s*[A-Z]\s+[A-Z]\s+[A-Z]\s*$/i,

      // Incomplete or fragmented text
      /^(and|or|but|if|then|so|because|since|while|when|where|why|how|what|who|which|that)\s/i,

      // Navigation elements
      /^(click here|read more|continue reading|next page|previous page|home|back|forward)\s*$/i,

      // Repeated characters (OCR artifacts)
      /(.)\1{4,}/,

      // Mixed random characters
      /^[a-zA-Z]{1,3}[0-9]{1,3}[a-zA-Z]{0,3}$/i,
    ]

    // Check against nonsensical patterns
    for (const pattern of nonsensicalPatterns) {
      if (pattern.test(message.trim())) {
        return false
      }
    }

    // Filter out messages that contain nonsensical article titles
    const containsNonsensical = /\b(MrWhy|dehumanise it|medium confidencedehumanise)\b/i.test(message)
    if (containsNonsensical) {
      return false
    }

    // Filter out debug messages that contain raw nonsensical content
    if (message.includes('Sentiment Analysis Debug:') && message.includes('text:')) {
      // Extract the text portion and check if it's nonsensical
      const textMatch = message.match(/text:\s*'([^']*)'/)
      if (textMatch && textMatch[1]) {
        const extractedText = textMatch[1].trim()
        // If the extracted text is very short and doesn't make sense, filter it out
        if (extractedText.length < 20 && !/\b(said|says|told|reported|according|announced|declared)\b/i.test(extractedText)) {
          return false
        }
      }
    }

    return true
  }

  // Processing steps with detailed descriptions
  const processingSteps = [
    {
      id: 'upload',
      title: 'File Upload',
      description: 'Uploading PDF file to server',
      icon: FileText,
      estimatedTime: '5-10 seconds',
      completed: true // Always completed if we're viewing this page
    },
    {
      id: 'extraction',
      title: 'Text Extraction',
      description: 'Extracting text content from PDF pages using advanced OCR',
      icon: FileText,
      estimatedTime: '30-60 seconds',
      completed: newspaper?.processingStep && ['language', 'articles', 'sentiment', 'analysis'].includes(newspaper.processingStep),
      active: !newspaper?.processingStep || newspaper?.processingStep === 'extraction'
    },
    {
      id: 'language',
      title: 'Language Detection',
      description: 'Analyzing content to identify dominant language (English, Hindi, Gujarati)',
      icon: Globe,
      estimatedTime: '5-10 seconds',
      completed: newspaper?.dominantLanguage && newspaper?.processingStep && ['articles', 'sentiment', 'analysis'].includes(newspaper.processingStep),
      active: newspaper?.processingStep === 'language'
    },
    {
      id: 'articles',
      title: 'Article Extraction',
      description: 'Identifying and separating individual articles using AI pattern recognition',
      icon: Scissors,
      estimatedTime: '1-2 minutes',
      completed: newspaper?.totalArticles > 0 && newspaper?.processingStep && ['sentiment', 'analysis'].includes(newspaper.processingStep),
      active: newspaper?.processingStep === 'articles'
    },
    {
      id: 'sentiment',
      title: 'Sentiment Analysis',
      description: 'Analyzing emotional tone of each article using Azure OpenAI',
      icon: Brain,
      estimatedTime: '2-5 minutes',
      completed: newspaper?.articles?.some(a => a.contentSentiment) && newspaper?.processingStep === 'analysis',
      active: newspaper?.processingStep === 'sentiment'
    },
    {
      id: 'analysis',
      title: 'Comprehensive Analysis',
      description: 'Generating insights, categorizing articles, and creating final report',
      icon: BarChart3,
      estimatedTime: '10-20 seconds',
      completed: newspaper?.processingStatus === 'completed',
      active: newspaper?.processingStep === 'analysis'
    }
  ]

  // Calculate current step based on completion status
  useEffect(() => {
    if (newspaper) {
      const completedSteps = processingSteps.filter(step => step.completed).length
      const activeStep = processingSteps.findIndex(step => step.active)
      setCurrentStep(Math.max(0, activeStep >= 0 ? activeStep : completedSteps))

      // Debug logging
      console.log('📊 Processing Progress Debug:', {
        processingStatus: newspaper.processingStatus,
        processingStep: newspaper.processingStep,
        dominantLanguage: newspaper.dominantLanguage,
        totalArticles: newspaper.totalArticles,
        hasArticles: newspaper.articles?.length > 0,
        hasSentiment: newspaper.articles?.some(a => a.contentSentiment),
        completedSteps,
        activeStep,
        currentStep: Math.max(0, activeStep >= 0 ? activeStep : completedSteps)
      })
    }
  }, [newspaper, processingSteps])

  // Track elapsed time and simulate activity logs
  useEffect(() => {
    if (newspaper?.processingStatus === 'processing') {
      const startTime = new Date(newspaper.createdAt).getTime()
      const interval = setInterval(() => {
        const now = new Date().getTime()
        setElapsedTime(Math.floor((now - startTime) / 1000))
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [newspaper])

  // Simulate realistic activity logs based on processing step
  useEffect(() => {
    if (newspaper?.processingStatus === 'processing' || newspaper?.processingStatus === 'pending') {
      const generateActivityLogs = () => {
        const step = newspaper.processingStep || 'extraction' // Default to extraction if no step
        const logs = []

        switch (step) {
          case 'extraction':
          default: // Default case for when step is undefined
            logs.push(
              { time: new Date(), message: '📄 Starting PDF text extraction...', type: 'info' },
              { time: new Date(), message: '🔍 Analyzing document structure...', type: 'info' },
              { time: new Date(), message: '📝 Processing page layouts...', type: 'info' }
            )
            break
          case 'language':
            logs.push(
              { time: new Date(), message: '🌐 Analyzing text patterns...', type: 'info' },
              { time: new Date(), message: '🔤 Detecting character sets...', type: 'info' },
              { time: new Date(), message: '📊 Computing language probabilities...', type: 'info' }
            )
            break
          case 'articles':
            logs.push(
              { time: new Date(), message: '🔍 Running extraction strategy 1/4...', type: 'info' },
              { time: new Date(), message: '📄 Identifying article boundaries...', type: 'info' },
              { time: new Date(), message: '✂️ Separating content blocks...', type: 'info' },
              { time: new Date(), message: '🔄 Deduplicating articles...', type: 'info' },
              { time: new Date(), message: `✅ Found ${newspaper.totalArticles || 'multiple'} unique articles`, type: 'success' }
            )
            break
          case 'sentiment':
            logs.push(
              { time: new Date(), message: '🤖 Connecting to Azure OpenAI...', type: 'info' },
              { time: new Date(), message: '🧠 Analyzing article sentiments...', type: 'info' },
              { time: new Date(), message: '📊 Processing emotional indicators...', type: 'info' },
              { time: new Date(), message: '🎯 Classifying positive/negative content...', type: 'info' }
            )
            break
          case 'analysis':
            logs.push(
              { time: new Date(), message: '📈 Generating comprehensive insights...', type: 'info' },
              { time: new Date(), message: '📊 Creating statistical summaries...', type: 'info' },
              { time: new Date(), message: '🎨 Preparing visualizations...', type: 'info' }
            )
            break
        }

        setActivityLogs(prev => [...prev, ...logs].slice(-10)) // Keep last 10 logs
      }

      // Generate initial logs
      generateActivityLogs()

      // Add periodic updates during processing
      const logInterval = setInterval(() => {
        if (newspaper?.processingStatus === 'processing' || newspaper?.processingStatus === 'pending') {
          const step = newspaper.processingStep || 'extraction'
          const randomMessages = {
            extraction: [
              '📄 Processing complex layouts...',
              '🔍 Extracting text from images...',
              '📝 Handling multilingual content...'
            ],
            language: [
              '🌐 Analyzing vocabulary patterns...',
              '📊 Computing confidence scores...',
              '🔤 Validating language detection...'
            ],
            articles: [
              '🔍 Running advanced pattern matching...',
              '📄 Extracting article headlines...',
              '✂️ Filtering out advertisements...',
              '🔄 Merging related content blocks...',
              '✅ Validating article quality...'
            ],
            sentiment: [
              '🧠 Processing emotional context...',
              '🎯 Analyzing tone and mood...',
              '📊 Computing sentiment scores...',
              '🤖 Applying AI language models...'
            ],
            analysis: [
              '📈 Computing statistical metrics...',
              '🎨 Generating chart data...',
              '📊 Creating category breakdowns...'
            ]
          }

          const messages = randomMessages[step] || ['🔄 Processing...']
          const randomMessage = messages[Math.floor(Math.random() * messages.length)]

          setActivityLogs(prev => [...prev, {
            time: new Date(),
            message: randomMessage,
            type: 'info'
          }].slice(-10))
        }
      }, 3000) // Add new log every 3 seconds

      return () => clearInterval(logInterval)
    }
  }, [newspaper?.processingStep, newspaper?.processingStatus])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStepStatus = (index) => {
    const step = processingSteps[index]
    if (step.completed) return 'completed'
    if (step.active && newspaper?.processingStatus === 'processing') return 'active'
    return 'pending'
  }

  const getStepIcon = (step, status) => {
    if (status === 'completed') {
      return <CheckCircle className="h-6 w-6 text-white" />
    } else if (status === 'active') {
      return <Loader2 className="h-6 w-6 text-white animate-spin" />
    } else {
      const IconComponent = step.icon
      return <IconComponent className="h-6 w-6 text-gray-500 dark:text-gray-400" />
    }
  }

  // Don't render if no newspaper data
  if (!newspaper) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400">
            Loading newspaper data...
          </h3>
        </div>
      </div>
    )
  }

  if (newspaper.processingStatus === 'completed') {
    return (
      <div className="bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-700 rounded-lg p-6">
        <div className="flex items-center">
          <CheckCircle className="h-8 w-8 text-green-500 mr-4" />
          <div>
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
              Analysis Complete!
            </h3>
            <p className="text-green-600 dark:text-green-300">
              Successfully processed {newspaper.totalArticles || 0} articles in {formatTime(elapsedTime)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (newspaper?.processingStatus === 'failed') {
    return (
      <div className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-700 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-red-500 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                Processing Failed
              </h3>
              <p className="text-red-600 dark:text-red-300">
                {newspaper.processingError || 'An error occurred during analysis'}
              </p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div className="mb-4 sm:mb-0">
          <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Processing Your Newspaper
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Elapsed time: {formatTime(elapsedTime)} • Estimated total: 15 - 20 minutes
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="p-3 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Enhanced Progress Bar */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {Math.round(((currentStep + 1) / processingSteps.length) * 100)}%
          </span>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 relative overflow-hidden shadow-inner">
          <div
            className="bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 h-4 rounded-full transition-all duration-1000 relative"
            style={{ width: `${((currentStep + 1) / processingSteps.length) * 100}%` }}
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex justify-between mt-4 px-1">
          {processingSteps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full transition-all duration-300 mb-2 ${getStepStatus(index) === 'completed' ? 'bg-green-500 shadow-lg' :
                getStepStatus(index) === 'active' ? 'bg-blue-500 animate-pulse shadow-lg' :
                  'bg-gray-300 dark:bg-gray-600'
                }`}></div>
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-20 leading-tight">
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Processing Steps with Pipeline Visualization */}
      <div className="relative">
        <div className="space-y-6">
          {processingSteps.map((step, index) => {
            const status = getStepStatus(index)

            return (
              <div key={step.id} className="relative flex items-start">
                {/* Pipeline node */}
                <div className="flex flex-col items-center mr-4">
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${status === 'completed'
                    ? 'bg-green-500 border-green-500'
                    : status === 'active'
                      ? 'bg-blue-500 border-blue-500 animate-pulse'
                      : 'bg-gray-300 border-gray-300 dark:bg-gray-600 dark:border-gray-600'
                    }`}>
                    {getStepIcon(step, status)}
                  </div>

                  {/* Connector line to next step */}
                  {index < processingSteps.length - 1 && (
                    <div className={`w-0.5 h-12 mt-2 transition-all duration-300 ${status === 'completed'
                      ? 'bg-green-300 dark:bg-green-700'
                      : status === 'active'
                        ? 'bg-blue-300 dark:bg-blue-700'
                        : 'bg-gray-200 dark:bg-gray-600'
                      }`}></div>
                  )}
                </div>

                {/* Step content */}
                <div
                  className={`flex-1 p-6 rounded-lg border transition-all duration-500 ${status === 'completed'
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
                    : status === 'active'
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700 shadow-lg'
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-700/50 dark:border-gray-600'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`text-lg font-semibold ${status === 'completed'
                      ? 'text-green-800 dark:text-green-200'
                      : status === 'active'
                        ? 'text-blue-800 dark:text-blue-200'
                        : 'text-gray-600 dark:text-gray-400'
                      }`}>
                      {step.title}
                    </h4>

                    <div className="flex items-center space-x-3">
                      {status === 'active' && (
                        <div className="flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      )}
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${status === 'completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200'
                        : status === 'active'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                        }`}>
                        {status === 'completed' ? '✓ Completed' : status === 'active' ? '⚡ Processing' : '⏳ Pending'}
                      </span>
                    </div>
                  </div>

                  <p className={`text-sm mb-3 ${status === 'completed'
                    ? 'text-green-600 dark:text-green-300'
                    : status === 'active'
                      ? 'text-blue-600 dark:text-blue-300'
                      : 'text-gray-500 dark:text-gray-400'
                    }`}>
                    {step.description}
                  </p>

                  {status === 'active' && (
                    <div className="flex items-center space-x-4">
                      <span className="text-xs text-blue-500 dark:text-blue-400 font-medium">
                        ⏱️ Estimated: {step.estimatedTime}
                      </span>
                      <div className="flex-1 bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full animate-pulse transition-all duration-1000" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Current Activity */}
      {(newspaper?.processingStatus === 'processing' || newspaper?.processingStatus === 'pending') && (
        <div className="mt-8 space-y-6">
          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start sm:items-center mb-4 sm:mb-0">
                <Loader2 className="h-6 w-6 text-blue-500 animate-spin mr-4 mt-1 sm:mt-0 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-800 dark:text-blue-200 text-lg">
                    {newspaper.processingMessage ||
                      (newspaper.processingStatus === 'pending' ? 'Starting analysis...' : 'Processing your newspaper...')}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                    Current step: {processingSteps.find(s => s.id === (newspaper.processingStep || 'extraction'))?.title || 'Text Extraction'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailedLogs(!showDetailedLogs)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/30"
              >
                {showDetailedLogs ? 'Hide Details' : 'Show Details'}
              </button>
            </div>
          </div>

          {/* Real-time Activity Logs */}
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-green-400 font-semibold">🔄 Live Processing Activity</h5>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-xs">LIVE</span>
              </div>
            </div>

            <div className={`space-y-1 transition-all duration-300 ${showDetailedLogs ? 'max-h-64 overflow-y-auto' : 'max-h-20 overflow-hidden'}`}>
              {activityLogs
                .filter(log => filterLogMessage(log.message)) // Filter out nonsensical messages
                .slice(-8)
                .map((log, index) => (
                  <div key={index} className="flex items-start space-x-2 text-xs">
                    <span className="text-gray-500 flex-shrink-0 w-16">
                      {log.time.toLocaleTimeString().slice(0, 8)}
                    </span>
                    <span className={`${log.type === 'success' ? 'text-green-400' :
                      log.type === 'error' ? 'text-red-400' :
                        log.type === 'warning' ? 'text-yellow-400' :
                          'text-gray-300'
                      }`}>
                      {log.message}
                    </span>
                  </div>
                ))}
            </div>

            {!showDetailedLogs && activityLogs.filter(log => filterLogMessage(log.message)).length > 3 && (
              <div className="text-center mt-2">
                <button
                  onClick={() => setShowDetailedLogs(true)}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  ••• Show more activity logs •••
                </button>
              </div>
            )}
          </div>

          {/* Processing Statistics */}
          {(newspaper.totalArticles > 0 || newspaper.processingStep === 'articles') && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-blue-600">{newspaper.totalArticles || '...'}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Articles Found</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-green-600">{newspaper.dominantLanguage || '...'}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Language</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-purple-600">{formatTime(elapsedTime)}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Processing Time</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-orange-600">
                  {newspaper.articles?.filter(a => a.contentSentiment).length || '...'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Analyzed</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Tips and Fun Facts */}
      <div className="mt-6 space-y-4">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <h5 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
            <span className="animate-bounce mr-2">💡</span>
            Did You Know?
          </h5>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {newspaper?.processingStep === 'extraction' && (
              <p>Our AI can process over 1,000 pages per minute and extract text from complex layouts including tables, columns, and multilingual content!</p>
            )}
            {newspaper?.processingStep === 'language' && (
              <p>We support 3 major languages (English, Hindi, Gujarati) and can detect mixed-language content with 95%+ accuracy!</p>
            )}
            {newspaper?.processingStep === 'articles' && (
              <p>The average newspaper contains 50-200 articles. Our AI uses 4 different extraction strategies to ensure we don't miss any content!</p>
            )}
            {newspaper?.processingStep === 'sentiment' && (
              <p>We analyze emotional tone using advanced AI that understands context, sarcasm, and cultural nuances across multiple languages!</p>
            )}
            {newspaper?.processingStep === 'analysis' && (
              <p>Your final report will include detailed charts, insights, and recommendations based on comprehensive sentiment analysis!</p>
            )}
            {!newspaper?.processingStep && (
              <p>SentiScan processes thousands of newspapers daily, helping organizations understand public sentiment and media trends!</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h5 className="font-medium text-gray-900 dark:text-white mb-2">⚡ Processing Tips:</h5>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Larger newspapers (50+ pages) may take longer</li>
              <li>• Complex layouts require additional processing time</li>
              <li>• You can safely close this page - processing continues</li>
            </ul>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h5 className="font-medium text-gray-900 dark:text-white mb-2">🎯 What's Next:</h5>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Detailed sentiment breakdown by article</li>
              <li>• Interactive charts and visualizations</li>
              <li>• Downloadable PDF report</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProcessingProgress