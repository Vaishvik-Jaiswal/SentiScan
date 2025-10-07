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
    
    // Upload to Azure Blob Storage (REQUIRED)
    if (!azureStorage.isConfigured || !azureStorage.isConfigured()) {
      console.error('❌ Azure Storage is not configured!')
      res.status(500)
      throw new Error('Azure Storage is not configured. Please configure Azure Storage to upload files.')
    }

    const uploadResult = await azureStorage.uploadFile(buffer, originalname, mimetype)
    blobName = uploadResult.blobName
    url = uploadResult.url
    console.log('✅ Azure upload successful:', { blobName, url })

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
      headingSentimentReason: sentiment.headingSentimentReason,
      contentSentiment: sentiment.contentSentiment,
      contentSentimentReason: sentiment.contentSentimentReason,
      confidence: sentiment.confidence
    })
    
    if (sentiment.error) {
      console.warn(`⚠️ Sentiment analysis completed with warning: ${sentiment.error}`)
    }
    
    await Article.findByIdAndUpdate(articleId, {
      headingSentiment: sentiment.headingSentiment,
      headingSentimentReason: sentiment.headingSentimentReason,
      contentSentiment: sentiment.contentSentiment,
      contentSentimentReason: sentiment.contentSentimentReason,
      sentimentConfidence: sentiment.confidence,
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
  let article
  
  // If user is admin, allow access to any article
  if (req.user.role === 'admin') {
    article = await Article.findById(req.params.id)
  } else {
    // Regular users can only access their own articles
    article = await Article.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
  }

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
  
  let article
  
  // If user is admin, allow deletion of any article
  if (req.user.role === 'admin') {
    article = await Article.findById(req.params.id)
  } else {
    // Regular users can only delete their own articles
    article = await Article.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
  }

  if (!article) {
    console.log(`❌ Article not found: ${req.params.id}`)
    res.status(404)
    throw new Error('Article not found')
  }

  console.log(`✅ Article found: ${article._id}, filename: ${article.filename}`)

  try {
    // Delete from Azure Blob Storage if it's an uploaded file
    if (article.blobUrl && article.blobUrl.startsWith('https://')) {
      console.log(`🗑️ Attempting to delete from Azure Blob Storage: ${article.filename}`)
      
      if (azureStorage.isConfigured && azureStorage.isConfigured()) {
        await azureStorage.deleteFile(article.filename)
        console.log(`✅ File deleted from Azure Blob Storage: ${article.filename}`)
      } else {
        console.log(`⚠️ Azure Storage not configured, skipping blob deletion`)
      }
    } else if (article.filename?.startsWith('text-')) {
      console.log(`ℹ️ Skipping file deletion for text-based article: ${article.filename}`)
    } else {
      console.log(`ℹ️ No blob URL found, skipping file deletion: ${article.filename}`)
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

// @desc    Serve article file
// @route   GET /api/articles/:id/file
// @access  Private
export const serveArticleFile = asyncHandler(async (req, res) => {
  console.log(`📁 File serve request for article: ${req.params.id}`)
  
  try {
    const article = await Article.findById(req.params.id)

    if (!article) {
      console.log(`❌ Article not found: ${req.params.id}`)
      res.status(404)
      throw new Error('Article not found')
    }

    // Check if user owns this article
    if (article.userId.toString() !== req.user._id.toString()) {
      console.log(`❌ User ${req.user._id} not authorized to access article ${req.params.id}`)
      res.status(401)
      throw new Error('User not authorized')
    }

    console.log(`📄 Found article: ${article.heading}`)

    // Set appropriate headers based on file type
    const fileType = article.fileType?.toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (fileType) {
      case 'pdf':
        contentType = 'application/pdf'
        break
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'png':
        contentType = 'image/png'
        break
      case 'gif':
        contentType = 'image/gif'
        break
      case 'bmp':
        contentType = 'image/bmp'
        break
      case 'webp':
        contentType = 'image/webp'
        break
      case 'txt':
        contentType = 'text/plain; charset=utf-8'
        break
      case 'docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        break
    }

    // If it's a text-based article (created from paste, no actual file), return the content as text
    if (article.filename?.startsWith('text-') || (!article.blobUrl && !article.filename)) {
      console.log(`📝 Serving text content for article: ${req.params.id}`)
      res.set({
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `inline; filename="${article.originalName || 'article.txt'}"`,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:5173'
      })
      return res.send(article.content || 'No content available')
    }

    // Check if we have a blob URL
    if (article.blobUrl) {
      // Handle Azure Storage files
      if (article.blobUrl.startsWith('https://')) {
        if (!azureStorage.isConfigured || !azureStorage.isConfigured()) {
          console.error(`❌ Azure Storage not configured but file has blob URL: ${article.blobUrl}`)
          
          // Fall back to serving OCR content instead of failing
          console.log(`ℹ️ Falling back to serving OCR content`)
          res.set({
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `inline; filename="extracted-${article.originalName || 'content.txt'}"`,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:5173'
          })
          return res.send(article.content || 'Original file not accessible. This is the extracted content.')
        }

        try {
          console.log(`☁️ Downloading blob content for: ${article.filename}`)
          const blobBuffer = await azureStorage.downloadFile(article.filename)
          console.log(`✅ Downloaded blob content, streaming to client...`)
          
          // Set appropriate headers for direct content serving
          res.set({
            'Content-Type': contentType,
            'Content-Length': blobBuffer.length,
            'Content-Disposition': `inline; filename="${article.originalName || 'file'}"`,
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:5173',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Authorization, Content-Type'
          })
          
          return res.send(blobBuffer)
        } catch (blobError) {
          console.error(`❌ Error downloading blob content:`, blobError)
          
          // Fall back to serving OCR content
          console.log(`ℹ️ Falling back to serving OCR content`)
          res.set({
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `inline; filename="extracted-${article.originalName || 'content.txt'}"`,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:5173'
          })
          return res.send(article.content || 'Original file not accessible. This is the extracted content.')
        }
      } 
      // Handle local:// URLs by serving OCR content
      else if (article.blobUrl.startsWith('local://')) {
        console.log(`ℹ️ Local file URL detected: ${article.blobUrl}`)
        console.log(`ℹ️ Serving OCR content instead of local file`)
        
        res.set({
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `inline; filename="extracted-${article.originalName || 'content.txt'}"`,
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:5173'
        })
        return res.send(article.content || 'Original file not accessible. This is the extracted content.')
      }
    }

    // If no blob URL, serve OCR content
    console.log(`ℹ️ No blob URL, serving OCR content: filename="${article.filename}"`)
    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `inline; filename="extracted-${article.originalName || 'content.txt'}"`,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:5173'
    })
    return res.send(article.content || 'No content available')

  } catch (error) {
    console.error(`❌ Error in serveArticleFile:`, error)
    throw error
  }
})

// @desc    Get direct download URL for article file
// @route   GET /api/articles/:id/download-url
// @access  Private
export const getDownloadUrl = asyncHandler(async (req, res) => {
  console.log(`🔗 Download URL request for article: ${req.params.id}`)
  
  try {
    const article = await Article.findById(req.params.id)

    if (!article) {
      console.log(`❌ Article not found: ${req.params.id}`)
      res.status(404)
      throw new Error('Article not found')
    }

    // Check if user owns this article
    if (article.userId.toString() !== req.user._id.toString()) {
      console.log(`❌ User ${req.user._id} not authorized to access article ${req.params.id}`)
      res.status(401)
      throw new Error('User not authorized')
    }

    // If it's a text-based article (no actual file), return content as downloadable text
    if (article.filename?.startsWith('text-') || (!article.blobUrl && !article.filename)) {
      console.log(`📝 Generating download URL for text content: ${req.params.id}`)
      
      // Create a data URL for the text content
      const textContent = article.content || 'No content available'
      const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(textContent)}`
      
      return res.json({
        downloadUrl: dataUrl,
        filename: article.originalName || 'article.txt',
        fileType: 'txt',
        isDirectUrl: false
      })
    }

    // Check if we have a blob URL for Azure Storage
    if (article.blobUrl && article.blobUrl.startsWith('https://')) {
      if (!azureStorage.isConfigured || !azureStorage.isConfigured()) {
        console.error(`❌ Azure Storage not configured but file has blob URL: ${article.blobUrl}`)
        res.status(500)
        throw new Error('Azure Storage not configured')
      }

      try {
        console.log(`☁️ Generating fresh SAS URL for Azure blob: ${article.filename}`)
        const sasUrl = await azureStorage.generateSasUrl(article.filename, 1) // 1 hour expiry
        
        console.log(`✅ Generated fresh SAS URL for download`)
        
        return res.json({
          downloadUrl: sasUrl,
          filename: article.originalName,
          fileType: article.fileType,
          isDirectUrl: true
        })
      } catch (blobError) {
        console.error(`❌ Error generating SAS URL:`, blobError)
        res.status(500)
        throw new Error('Failed to generate download URL')
      }
    }

    // Fallback: return content as text
    console.log(`ℹ️ No blob URL, returning content as text: ${req.params.id}`)
    const textContent = article.content || 'No content available'
    const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(textContent)}`
    
    res.json({
      downloadUrl: dataUrl,
      filename: `extracted-${article.originalName || 'content.txt'}`,
      fileType: 'txt',
      isDirectUrl: false
    })

  } catch (error) {
    console.error(`❌ Error in getDownloadUrl:`, error)
    throw error
  }
})

// @desc    Get dashboard analytics
// @route   GET /api/articles/analytics
// @access  Private
export const getAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user._id

  // Sentiment distribution (merge Mixed with Neutral)
  const sentimentDistribution = await Article.aggregate([
    { $match: { userId } },
    {
      $addFields: {
        normalizedSentiment: {
          $cond: {
            if: { $eq: ['$contentSentiment', 'Mixed'] },
            then: 'Neutral',
            else: '$contentSentiment'
          }
        }
      }
    },
    { $group: { _id: '$normalizedSentiment', count: { $sum: 1 } } },
  ])

  // Sentiment trend over time (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const sentimentTrend = await Article.aggregate([
    { $match: { userId, createdAt: { $gte: thirtyDaysAgo } } },
    {
      $addFields: {
        normalizedSentiment: {
          $cond: {
            if: { $eq: ['$contentSentiment', 'Mixed'] },
            then: 'Neutral',
            else: '$contentSentiment'
          }
        }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          sentiment: '$normalizedSentiment',
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

// @desc    Download article as text file
// @route   GET /api/articles/:id/download
// @access  Private
export const downloadArticle = asyncHandler(async (req, res) => {
  const article = await Article.findOne({
    _id: req.params.id,
    userId: req.user._id,
  })

  if (!article) {
    res.status(404)
    throw new Error('Article not found')
  }

  // Create text content
  const textContent = `
News Article Analysis Report
Generated on: ${new Date().toLocaleDateString()}

HEADLINE:
${article.heading}

CONTENT:
${article.content}

ANALYSIS:
- Language: ${article.language}
- File Type: ${article.fileType}
- Upload Date: ${article.createdAt.toLocaleDateString()}

SENTIMENT ANALYSIS:
- Headline Sentiment: ${article.headingSentiment || 'Not analyzed'}
- Content Sentiment: ${article.contentSentiment || 'Not analyzed'}
- Headline Reason: ${article.headingSentimentReason || 'Not available'}
- Content Reason: ${article.contentSentimentReason || 'Not available'}

---
Generated by SentiScan AI News Analysis Platform
  `.trim()

  // Set headers for file download
  const filename = `article-${article._id}-${new Date().toISOString().split('T')[0]}.txt`
  
  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-Length', Buffer.byteLength(textContent, 'utf8'))
  
  res.send(textContent)
})

export { upload }
