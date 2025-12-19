import express from 'express'
import {
  uploadNewspaper,
  getUserNewspapers,
  getNewspaperById,
  deleteNewspaper,
  generatePDFReport,
  upload
} from '../controllers/newspaperController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// @route   POST /api/newspaper/upload
// @desc    Upload and analyze newspaper
// @access  Private
router.post('/upload', protect, upload.single('newspaper'), uploadNewspaper)

// @route   GET /api/newspaper
// @desc    Get user's newspapers
// @access  Private
router.get('/', protect, getUserNewspapers)

// @route   GET /api/newspaper/:id
// @desc    Get newspaper by ID
// @access  Private
router.get('/:id', protect, getNewspaperById)

// @route   DELETE /api/newspaper/:id
// @desc    Delete newspaper
// @access  Private
router.delete('/:id', protect, deleteNewspaper)

// @route   GET /api/newspaper/:id/pdf-report
// @desc    Generate PDF report for newspaper analysis
// @access  Private
router.get('/:id/pdf-report', protect, generatePDFReport)

export default router

