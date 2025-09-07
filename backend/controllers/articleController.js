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
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'), false)
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
                 : 'txt'

  try {
    // Upload to Azure Blob Storage
    const { blobName, url } = await azureStorage.uploadFile(buffer, originalname, mimetype)

    // Extract text from file
    const { heading, content, detectedLanguage } = await textExtractor.extractText(buffer, fileType, originalname)

    // Create article record
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
    console.error('Error uploading article:', error)
    res.status(500)
    throw new Error('Failed to upload and process article')
  }
})

// Background function to process sentiment analysis
const processSentimentAnalysis = async (articleId) => {
  try {
    const article = await Article.findById(articleId)
    if (!article) return

    const sentiment = await sentimentAnalysis.analyzeSentiment(article.heading, article.content)
    
    await Article.findByIdAndUpdate(articleId, {
      headingSentiment: sentiment.headingSentiment,
      contentSentiment: sentiment.contentSentiment,
      sentimentAnalysisDate: new Date(),
      processingStatus: 'completed',
    })
  } catch (error) {
    console.error('Error processing sentiment analysis:', error)
    await Article.findByIdAndUpdate(articleId, {
      processingStatus: 'failed',
      errorMessage: error.message,
    })
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
  const article = await Article.findOne({
    _id: req.params.id,
    userId: req.user._id,
  })

  if (!article) {
    res.status(404)
    throw new Error('Article not found')
  }

  // Delete from Azure Blob Storage
  await azureStorage.deleteFile(article.filename)

  // Delete from database
  await Article.findByIdAndDelete(req.params.id)

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

export { upload }
