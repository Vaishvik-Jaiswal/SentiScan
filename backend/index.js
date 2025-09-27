import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import connectDB from './config/db.js'
import userRoutes from './routes/userRoutes.js'
import articleRoutes from './routes/articleRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import newsComparisonRoutes from './routes/newsComparisonRoutes.js'
import { notFound, errorHandler } from './middleware/errorMiddleware.js'

dotenv.config()
connectDB()

const app = express()
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json())

// Routes
app.use('/api/users', userRoutes)
app.use('/api/articles', articleRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/news-comparison', newsComparisonRoutes)

// Root
app.get('/', (req, res) => {
  res.send('SentiScan Backend is live!')
})

// Error handling
app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))
