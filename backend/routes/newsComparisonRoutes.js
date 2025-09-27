import express from 'express'
import { 
  createNewsComparison,
  addArticleToComparison,
  startComparisonAnalysis,
  getUserComparisons,
  getComparisonById,
  deleteComparison
} from '../controllers/newsComparisonController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

router.route('/')
  .get(getUserComparisons)
  .post(createNewsComparison)

router.route('/:id')
  .get(getComparisonById)
  .delete(deleteComparison)

router.route('/:id/add-article')
  .post(addArticleToComparison)

router.route('/:id/analyze')
  .post(startComparisonAnalysis)

export default router
