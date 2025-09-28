import express from 'express'
import { 
  uploadArticle, 
  getUserArticles, 
  getArticleById, 
  deleteArticle, 
  getAnalytics,
  createFromText,
  serveArticleFile,
  getDownloadUrl,
  downloadArticle,
  upload 
} from '../controllers/articleController.js'
import { protect } from '../middleware/authMiddleware.js'
import azureStorage from '../services/azureStorage.js'

const router = express.Router()

// All routes are protected
router.use(protect)

router.route('/')
  .get(getUserArticles)

router.route('/upload')
  .post(upload.single('file'), uploadArticle)

router.route('/text')
  .post(createFromText)

router.route('/analytics')
  .get(getAnalytics)

// Test endpoint for debugging
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Testing article upload components...')
    
    // Test Azure Storage
    const azureConfigured = azureStorage.isConfigured ? azureStorage.isConfigured() : false
    console.log('☁️ Azure Storage configured:', azureConfigured)
    
    // Test text extractor
    const testText = 'Hello world! This is a test.'
    const testBuffer = Buffer.from(testText)
    
    console.log('📄 Testing text extraction...')
    const { extractText } = await import('../services/textExtractor.js')
    
    res.json({
      status: 'ok',
      azureConfigured,
      textExtractorLoaded: true,
      user: req.user ? { id: req.user._id, username: req.user.username } : null
    })
  } catch (error) {
    console.error('❌ Test endpoint error:', error)
    res.status(500).json({
      status: 'error',
      error: error.message,
      stack: error.stack
    })
  }
})

router.route('/:id')
  .get(getArticleById)
  .delete(deleteArticle)

router.route('/:id/download')
  .get(downloadArticle)

router.route('/:id/file')
  .get(serveArticleFile)

router.route('/:id/download-url')
  .get(getDownloadUrl)

export default router
