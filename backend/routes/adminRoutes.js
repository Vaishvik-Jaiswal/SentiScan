import express from 'express'
import {
  getAdminOverview,
  getAllUsers,
  getAllArticles,
  getUserDetails,
  toggleUserStatus,
  deleteArticle,
  getSystemStats
} from '../controllers/adminController.js'
import { adminAuth } from '../middleware/adminMiddleware.js'

const router = express.Router()

// All routes are protected with admin authentication
router.use(adminAuth)

// Admin dashboard overview
router.get('/overview', getAdminOverview)

// System statistics
router.get('/stats', getSystemStats)

// User management
router.get('/users', getAllUsers)
router.get('/users/:userId', getUserDetails)
router.patch('/users/:userId/toggle-status', toggleUserStatus)

// Article management
router.get('/articles', getAllArticles)
router.delete('/articles/:articleId', deleteArticle)

export default router
