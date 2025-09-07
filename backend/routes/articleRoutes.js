import express from 'express'
import { 
  uploadArticle, 
  getUserArticles, 
  getArticleById, 
  deleteArticle, 
  getAnalytics,
  upload 
} from '../controllers/articleController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

router.route('/')
  .get(getUserArticles)

router.route('/upload')
  .post(upload.single('file'), uploadArticle)

router.route('/analytics')
  .get(getAnalytics)

router.route('/:id')
  .get(getArticleById)
  .delete(deleteArticle)

export default router
