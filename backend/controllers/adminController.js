import User from '../models/User.js'
import Article from '../models/Article.js'
import mongoose from 'mongoose'

// Get admin dashboard overview
export const getAdminOverview = async (req, res) => {
  try {
    // Get total counts
    const totalUsers = await User.countDocuments({ role: 'user' })
    const totalAdmins = await User.countDocuments({ role: 'admin' })
    const totalArticles = await Article.countDocuments()
    
    // Get user registrations in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const newUsersLast30Days = await User.countDocuments({
      role: 'user',
      createdAt: { $gte: thirtyDaysAgo }
    })

    // Get articles uploaded in last 30 days
    const newArticlesLast30Days = await Article.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    })

    // Get sentiment distribution across all articles (merge Mixed with Neutral)
    const sentimentDistribution = await Article.aggregate([
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
          _id: '$normalizedSentiment',
          count: { $sum: 1 }
        }
      }
    ])

    // Get language distribution
    const languageDistribution = await Article.aggregate([
      {
        $group: {
          _id: '$detectedLanguage',
          count: { $sum: 1 }
        }
      }
    ])

    // Get processing status distribution
    const processingStatusDistribution = await Article.aggregate([
      {
        $group: {
          _id: '$processingStatus',
          count: { $sum: 1 }
        }
      }
    ])

    // Get daily user registrations for the last 30 days
    const userRegistrationTrend = await User.aggregate([
      {
        $match: {
          role: 'user',
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ])

    // Get daily article uploads for the last 30 days
    const articleUploadTrend = await Article.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ])

    // Get top active users (by article count)
    const topActiveUsers = await Article.aggregate([
      {
        $group: {
          _id: '$userId',
          articleCount: { $sum: 1 },
          lastActivity: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $match: {
          'user.role': 'user'
        }
      },
      {
        $project: {
          _id: 1,
          username: '$user.username',
          email: '$user.email',
          articleCount: 1,
          lastActivity: 1
        }
      },
      {
        $sort: { articleCount: -1 }
      },
      {
        $limit: 10
      }
    ])

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalAdmins,
          totalArticles,
          newUsersLast30Days,
          newArticlesLast30Days
        },
        distributions: {
          sentiment: sentimentDistribution.reduce((acc, item) => {
            acc[item._id || 'Unknown'] = item.count
            return acc
          }, {}),
          language: languageDistribution.reduce((acc, item) => {
            acc[item._id || 'unknown'] = item.count
            return acc
          }, {}),
          processingStatus: processingStatusDistribution.reduce((acc, item) => {
            acc[item._id] = item.count
            return acc
          }, {})
        },
        trends: {
          userRegistrations: userRegistrationTrend,
          articleUploads: articleUploadTrend
        },
        topActiveUsers
      }
    })
  } catch (error) {
    console.error('Admin overview error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin overview',
      error: error.message
    })
  }
}

// Get all users with pagination
export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const search = req.query.search || ''
    const role = req.query.role || 'all'
    const status = req.query.status || 'all'
    
    const skip = (page - 1) * limit

    // Build query
    let query = {}
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }
    
    if (role !== 'all') {
      query.role = role
    }
    
    if (status !== 'all') {
      query.isActive = status === 'active'
    }

    // Get users with article count
    const users = await User.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'articles',
          localField: '_id',
          foreignField: 'userId',
          as: 'articles'
        }
      },
      {
        $project: {
          username: 1,
          email: 1,
          role: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
          articleCount: { $size: '$articles' },
          lastActivity: { $max: '$articles.createdAt' }
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ])

    const totalUsers = await User.countDocuments(query)
    const totalPages = Math.ceil(totalUsers / limit)

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    })
  } catch (error) {
    console.error('Get all users error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    })
  }
}

// Get all articles with user info
export const getAllArticles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const search = req.query.search || ''
    const status = req.query.status || 'all'
    const language = req.query.language || 'all'
    const sentiment = req.query.sentiment || 'all'
    
    const skip = (page - 1) * limit

    // Build query
    let query = {}
    
    if (search) {
      query.$or = [
        { heading: { $regex: search, $options: 'i' } },
        { originalName: { $regex: search, $options: 'i' } }
      ]
    }
    
    if (status !== 'all') {
      query.processingStatus = status
    }
    
    if (language !== 'all') {
      query.detectedLanguage = language
    }
    
    if (sentiment !== 'all') {
      query.contentSentiment = sentiment
    }

    // Get articles with user info
    const articles = await Article.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          originalName: 1,
          fileType: 1,
          fileSize: 1,
          heading: 1,
          detectedLanguage: 1,
          headingSentiment: 1,
          contentSentiment: 1,
          sentimentConfidence: 1,
          processingStatus: 1,
          createdAt: 1,
          updatedAt: 1,
          'user.username': 1,
          'user.email': 1,
          'user._id': 1
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ])

    const totalArticles = await Article.countDocuments(query)
    const totalPages = Math.ceil(totalArticles / limit)

    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          currentPage: page,
          totalPages,
          totalArticles,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    })
  } catch (error) {
    console.error('Get all articles error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch articles',
      error: error.message
    })
  }
}

// Get user details with their articles
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      })
    }

    const user = await User.findById(userId).select('-password')
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Get user's articles
    const articles = await Article.find({ userId })
      .select('originalName fileType fileSize heading detectedLanguage headingSentiment contentSentiment processingStatus createdAt')
      .sort({ createdAt: -1 })

    // Get user statistics
    const userStats = await Article.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalArticles: { $sum: 1 },
          sentimentDistribution: {
            $push: '$contentSentiment'
          },
          languageDistribution: {
            $push: '$detectedLanguage'
          },
          processingStats: {
            $push: '$processingStatus'
          }
        }
      }
    ])

    const stats = userStats[0] || {
      totalArticles: 0,
      sentimentDistribution: [],
      languageDistribution: [],
      processingStats: []
    }

    // Process distributions (merge Mixed with Neutral)
    const sentimentCounts = stats.sentimentDistribution.reduce((acc, sentiment) => {
      const normalizedSentiment = sentiment === 'Mixed' ? 'Neutral' : sentiment
      acc[normalizedSentiment] = (acc[normalizedSentiment] || 0) + 1
      return acc
    }, {})

    const languageCounts = stats.languageDistribution.reduce((acc, language) => {
      acc[language] = (acc[language] || 0) + 1
      return acc
    }, {})

    const processingCounts = stats.processingStats.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    res.json({
      success: true,
      data: {
        user,
        articles,
        statistics: {
          totalArticles: stats.totalArticles,
          sentimentDistribution: sentimentCounts,
          languageDistribution: languageCounts,
          processingDistribution: processingCounts
        }
      }
    })
  } catch (error) {
    console.error('Get user details error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details',
      error: error.message
    })
  }
}

// Toggle user active status
export const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      })
    }

    const user = await User.findById(userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify admin user status'
      })
    }

    user.isActive = !user.isActive
    await user.save()

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        userId: user._id,
        username: user.username,
        isActive: user.isActive
      }
    })
  } catch (error) {
    console.error('Toggle user status error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    })
  }
}

// Delete article (admin only)
export const deleteArticle = async (req, res) => {
  try {
    const { articleId } = req.params
    
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid article ID'
      })
    }

    const article = await Article.findById(articleId)
    
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      })
    }

    await Article.findByIdAndDelete(articleId)

    res.json({
      success: true,
      message: 'Article deleted successfully'
    })
  } catch (error) {
    console.error('Delete article error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete article',
      error: error.message
    })
  }
}

// Get system statistics
export const getSystemStats = async (req, res) => {
  try {
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get activity stats for different time periods
    const stats = await Promise.all([
      // Last 24 hours
      User.countDocuments({ createdAt: { $gte: last24Hours }, role: 'user' }),
      Article.countDocuments({ createdAt: { $gte: last24Hours } }),
      
      // Last 7 days
      User.countDocuments({ createdAt: { $gte: last7Days }, role: 'user' }),
      Article.countDocuments({ createdAt: { $gte: last7Days } }),
      
      // Last 30 days
      User.countDocuments({ createdAt: { $gte: last30Days }, role: 'user' }),
      Article.countDocuments({ createdAt: { $gte: last30Days } }),
      
      // Total counts
      User.countDocuments({ role: 'user' }),
      Article.countDocuments(),
      
      // Active users (users with articles)
      Article.distinct('userId').then(userIds => userIds.length)
    ])

    const [
      newUsers24h, newArticles24h,
      newUsers7d, newArticles7d,
      newUsers30d, newArticles30d,
      totalUsers, totalArticles,
      activeUsers
    ] = stats

    // Get storage usage (sum of all file sizes)
    const storageStats = await Article.aggregate([
      {
        $group: {
          _id: null,
          totalStorage: { $sum: '$fileSize' },
          averageFileSize: { $avg: '$fileSize' }
        }
      }
    ])

    const storage = storageStats[0] || { totalStorage: 0, averageFileSize: 0 }

    res.json({
      success: true,
      data: {
        activity: {
          last24Hours: {
            newUsers: newUsers24h,
            newArticles: newArticles24h
          },
          last7Days: {
            newUsers: newUsers7d,
            newArticles: newArticles7d
          },
          last30Days: {
            newUsers: newUsers30d,
            newArticles: newArticles30d
          }
        },
        totals: {
          users: totalUsers,
          articles: totalArticles,
          activeUsers
        },
        storage: {
          totalBytes: storage.totalStorage,
          averageFileSize: Math.round(storage.averageFileSize || 0),
          totalMB: Math.round(storage.totalStorage / (1024 * 1024)),
          totalGB: Math.round(storage.totalStorage / (1024 * 1024 * 1024) * 100) / 100
        }
      }
    })
  } catch (error) {
    console.error('Get system stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system statistics',
      error: error.message
    })
  }
}
