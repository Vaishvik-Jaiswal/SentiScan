import asyncHandler from 'express-async-handler'
import multer from 'multer'
import Article from '../models/Article.js'
import azureStorage from '../services/azureStorage.js'
import textExtractor from '../services/textExtractor.js'
import sentimentAnalysis from '../services/sentimentAnalysis.js'

// Configure multer for memory storage
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
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
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, TXT, and image files are allowed.'), false)
    }
  },
})

// @desc    Upload and process article
// @route   POST /api/articles/upload
// @access  Private
export const uploadArticle = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400)
    throw new Error('No file uploaded')
  }

  const { buffer, originalname, mimetype, size } = req.file
  const fileType = mimetype === 'application/pdf' ? 'pdf' 
                 : mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'docx'
                 : mimetype === 'text/plain' ? 'txt'
                 : mimetype === 'image/jpeg' ? 'jpg'
                 : mimetype === 'image/jpg' ? 'jpg'
                 : mimetype === 'image/png' ? 'png'
                 : mimetype === 'image/gif' ? 'gif'
                 : mimetype === 'image/bmp' ? 'bmp'
                 : mimetype === 'image/webp' ? 'webp'
                 : 'unknown'

  try {
    console.log('🔄 Starting file upload process...')
    console.log('📁 File info:', { originalname, mimetype, size, fileType })

    // Upload to Azure Blob Storage
    console.log('☁️ Uploading to Azure Blob Storage...')
    let blobName, url
    
    if (azureStorage.isConfigured && azureStorage.isConfigured()) {
      const uploadResult = await azureStorage.uploadFile(buffer, originalname, mimetype)
      blobName = uploadResult.blobName
      url = uploadResult.url
      console.log('✅ Azure upload successful:', { blobName })
    } else {
      console.log('⚠️ Azure Storage not configured, using local storage fallback')
      blobName = `local-${Date.now()}-${originalname}`
      url = `local://uploads/${blobName}`
    }

    // Extract text from file
    console.log('📄 Extracting text from file...')
    const { heading, content, detectedLanguage } = await textExtractor.extractText(buffer, fileType, originalname)
    console.log('✅ Text extraction successful:', { 
      headingLength: heading.length, 
      contentLength: content.length, 
      detectedLanguage 
    })

    // Create article record
    console.log('💾 Saving article to database...')
    const article = await Article.create({
      userId: req.user._id,
      filename: blobName,
      originalName: originalname,
      fileType,
      fileSize: size,
      blobUrl: url,
      heading,
      content,
      detectedLanguage,
      processingStatus: 'processing',
    })
    console.log('✅ Article saved to database:', article._id)

    // Process sentiment analysis in background
    console.log('🧠 Starting sentiment analysis...')
    processSentimentAnalysis(article._id)

    res.status(201).json({
      _id: article._id,
      filename: article.filename,
      originalName: article.originalName,
      fileType: article.fileType,
      heading: article.heading,
      detectedLanguage: article.detectedLanguage,
      processingStatus: article.processingStatus,
      createdAt: article.createdAt,
    })
  } catch (error) {
    console.error('❌ Error uploading article:', error)
    console.error('❌ Error stack:', error.stack)
    res.status(500).json({ 
      message: 'Failed to upload and process article',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Background function to process sentiment analysis
const processSentimentAnalysis = async (articleId) => {
  console.log(`🧠 Starting sentiment analysis for article ${articleId}...`)
  
  try {
    const article = await Article.findById(articleId)
    if (!article) {
      console.error(`❌ Article not found: ${articleId}`)
      return
    }
    
    console.log(`📄 Found article: ${article._id}, title: "${article.heading}"`)
    console.log(`🔍 Analyzing sentiment for article ${article._id}...`)
    
    const sentiment = await sentimentAnalysis.analyzeSentiment(article.heading, article.content)
    
    console.log(`✅ Sentiment analysis completed for article ${article._id}:`, {
      headingSentiment: sentiment.headingSentiment,
      contentSentiment: sentiment.contentSentiment,
      confidence: sentiment.confidence
    })
    
    if (sentiment.error) {
      console.warn(`⚠️ Sentiment analysis completed with warning: ${sentiment.error}`)
    }
    
    await Article.findByIdAndUpdate(articleId, {
      headingSentiment: sentiment.headingSentiment,
      contentSentiment: sentiment.contentSentiment,
      sentimentAnalysisDate: new Date(),
      processingStatus: 'completed',
    })
    
    console.log(`✅ Updated article ${article._id} with sentiment analysis results`)
  } catch (error) {
    console.error(`❌ Error processing sentiment analysis for article ${articleId}:`, error)
    console.error(`❌ Error details:`, error.message)
    
    try {
      await Article.findByIdAndUpdate(articleId, {
        processingStatus: 'failed',
        errorMessage: error.message,
      })
      console.log(`⚠️ Updated article ${articleId} with failed status`)
    } catch (updateError) {
      console.error(`❌ Failed to update article status:`, updateError)
    }
  }
}

// @desc    Get user's articles
// @route   GET /api/articles
// @access  Private
export const getUserArticles = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const skip = (page - 1) * limit

  const articles = await Article.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-content') // Exclude full content for performance

  const total = await Article.countDocuments({ userId: req.user._id })

  res.json({
    articles,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
})

// @desc    Get article by ID
// @route   GET /api/articles/:id
// @access  Private
export const getArticleById = asyncHandler(async (req, res) => {
  const article = await Article.findOne({
    _id: req.params.id,
    userId: req.user._id,
  })

  if (!article) {
    res.status(404)
    throw new Error('Article not found')
  }

  res.json(article)
})

// @desc    Delete article
// @route   DELETE /api/articles/:id
// @access  Private
export const deleteArticle = asyncHandler(async (req, res) => {
  console.log(`🗑️ Delete request for article ID: ${req.params.id}`)
  
  const article = await Article.findOne({
    _id: req.params.id,
    userId: req.user._id,
  })

  if (!article) {
    console.log(`❌ Article not found: ${req.params.id}`)
    res.status(404)
    throw new Error('Article not found')
  }

  console.log(`✅ Article found: ${article._id}, filename: ${article.filename}`)

  try {
    // Delete from Azure Blob Storage if it's not a local file
    if (article.filename && !article.filename.startsWith('local-') && !article.filename.startsWith('text-')) {
      console.log(`🗑️ Attempting to delete from Azure Blob Storage: ${article.filename}`)
      
      if (azureStorage.isConfigured && azureStorage.isConfigured()) {
        await azureStorage.deleteFile(article.filename)
        console.log(`✅ File deleted from Azure Blob Storage: ${article.filename}`)
      } else {
        console.log(`⚠️ Azure Storage not configured, skipping blob deletion`)
      }
    } else {
      console.log(`ℹ️ Skipping blob deletion for local/text file: ${article.filename}`)
    }
  } catch (storageError) {
    console.error(`❌ Error deleting from storage: ${storageError.message}`)
    // Continue with database deletion even if storage deletion fails
  }

  // Delete from database
  console.log(`🗑️ Deleting article from database: ${article._id}`)
  await Article.findByIdAndDelete(req.params.id)
  console.log(`✅ Article deleted from database: ${article._id}`)

  res.json({ message: 'Article deleted successfully' })
})

// @desc    Get dashboard analytics
// @route   GET /api/articles/analytics
// @access  Private
export const getAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user._id

  // Sentiment distribution
  const sentimentDistribution = await Article.aggregate([
    { $match: { userId } },
    { $group: { _id: '$contentSentiment', count: { $sum: 1 } } },
  ])

  // Sentiment trend over time (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const sentimentTrend = await Article.aggregate([
    { $match: { userId, createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          sentiment: '$contentSentiment',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': 1 } },
  ])

  // Language breakdown
  const languageBreakdown = await Article.aggregate([
    { $match: { userId } },
    { $group: { _id: '$detectedLanguage', count: { $sum: 1 } } },
  ])

  // Total stats
  const totalArticles = await Article.countDocuments({ userId })
  const completedAnalysis = await Article.countDocuments({ 
    userId, 
    processingStatus: 'completed' 
  })

  res.json({
    totalArticles,
    completedAnalysis,
    sentimentDistribution,
    sentimentTrend,
    languageBreakdown,
  })
})

// @desc    Create article from pasted text
// @route   POST /api/articles/text
// @access  Private
export const createFromText = asyncHandler(async (req, res) => {
  const { title, content, language } = req.body

  if (!title || !content) {
    res.status(400)
    throw new Error('Title and content are required')
  }

  try {
    // Detect language if not provided
    const detectedLanguage = language || textExtractor.detectLanguage(content)

    // Create article record
    const article = await Article.create({
      userId: req.user._id,
      filename: `text-${Date.now()}.txt`,
      originalName: `${title.substring(0, 50)}.txt`,
      fileType: 'txt',
      fileSize: Buffer.byteLength(content, 'utf8'),
      blobUrl: '', // No blob URL for pasted text
      heading: title,
      content,
      detectedLanguage,
      processingStatus: 'processing',
    })

    // Process sentiment analysis in background
    processSentimentAnalysis(article._id)

    res.status(201).json({
      _id: article._id,
      filename: article.filename,
      originalName: article.originalName,
      fileType: article.fileType,
      heading: article.heading,
      detectedLanguage: article.detectedLanguage,
      processingStatus: article.processingStatus,
      createdAt: article.createdAt,
    })
  } catch (error) {
    console.error('Error creating article from text:', error)
    res.status(500)
    throw new Error('Failed to create article from text')
  }
})

export { upload }
