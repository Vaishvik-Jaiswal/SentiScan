import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Admin authentication middleware
export const adminAuth = async (req, res, next) => {
  try {
    let token

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        token = req.headers.authorization.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        
        // Get user from token and check if admin
        const user = await User.findById(decoded.id).select('-password')
        
        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'User not found'
          })
        }

        if (user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
          })
        }

        if (!user.isActive) {
          return res.status(403).json({
            success: false,
            message: 'Account is deactivated'
          })
        }

        req.user = user
        next()
      } catch (error) {
        console.error('Admin auth error:', error)
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        })
      }
    } else {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      })
    }
  } catch (error) {
    console.error('Admin middleware error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error in admin authentication'
    })
  }
}
