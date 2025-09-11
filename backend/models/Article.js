import mongoose from 'mongoose'

const articleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'],
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    blobUrl: {
      type: String,
      required: false,
      default: '',
    },
    heading: {
      type: String,
      default: '',
    },
    content: {
      type: String,
      required: true,
    },
    detectedLanguage: {
      type: String,
      enum: ['english', 'hindi', 'gujarati', 'mixed', 'unknown'],
      default: 'unknown',
    },
    headingSentiment: {
      type: String,
      enum: ['Positive', 'Negative', 'Neutral', 'Mixed'],
      default: 'Neutral',
    },
    headingSentimentReason: {
      type: String,
      default: '',
    },
    contentSentiment: {
      type: String,
      enum: ['Positive', 'Negative', 'Neutral', 'Mixed'],
      default: 'Neutral',
    },
    contentSentimentReason: {
      type: String,
      default: '',
    },
    sentimentConfidence: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    sentimentAnalysisDate: {
      type: Date,
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
articleSchema.index({ userId: 1, createdAt: -1 })
articleSchema.index({ userId: 1, contentSentiment: 1 })
articleSchema.index({ userId: 1, headingSentiment: 1 })

const Article = mongoose.model('Article', articleSchema)
export default Article
