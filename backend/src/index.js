import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import connectDB from './config/db.js'
import userRoutes from './routes/userRoutes.js'
import { notFound, errorHandler } from './middleware/errorMiddleware.js'

dotenv.config()
connectDB()

const app = express()
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/users', userRoutes)

// Root
app.get('/', (req, res) => {
  res.send('🎉 MERN Template Backend is live!')
})

// Error handling
app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))
