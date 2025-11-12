import mongoose from 'mongoose'

const articleAnalysisSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  headingSentiment: {
    type: String,
    enum: ['Positive', 'Negative', 'Neutral'],
    default: 'Neutral',
  },
  headingSentimentReason: {
    type: String,
    default: '',
  },
  headingSentimentScore: {
    type: Number,
    min: -10,
    max: 10,
    default: 0,
  },
  headingPercentages: {
    positive: { type: Number, min: 0, max: 100, default: 0 },
    negative: { type: Number, min: 0, max: 100, default: 0 },
    neutral: { type: Number, min: 0, max: 100, default: 100 },
  },
  contentSentiment: {
    type: String,
    enum: ['Positive', 'Negative', 'Neutral'],
    default: 'Neutral',
  },
  contentSentimentReason: {
    type: String,
    default: '',
  },
  contentSentimentScore: {
    type: Number,
    min: -10,
    max: 10,
    default: 0,
  },
  contentPercentages: {
    positive: { type: Number, min: 0, max: 100, default: 0 },
    negative: { type: Number, min: 0, max: 100, default: 0 },
    neutral: { type: Number, min: 0, max: 100, default: 100 },
  },
  sentimentConfidence: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  },
  detectedLanguage: {
    type: String,
    enum: ['english', 'hindi', 'gujarati', 'mixed', 'unknown'],
    default: 'unknown',
  },
  wordCount: {
    type: Number,
    default: 0,
  },
  pageNumber: {
    type: Number,
    default: 1,
  },
  position: {
    type: Number,
    default: 0,
  },
})

const newspaperSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    newspaperName: {
      type: String,
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
    fileSize: {
      type: Number,
      required: true,
    },
    blobUrl: {
      type: String,
      required: false,
      default: '',
    },
    publicationDate: {
      type: Date,
      default: Date.now,
    },
    totalPages: {
      type: Number,
      default: 1,
    },
    totalArticles: {
      type: Number,
      default: 0,
    },
    articles: [articleAnalysisSchema],
    overallSentiment: {
      type: String,
      enum: ['Positive', 'Negative', 'Neutral'],
      default: 'Neutral',
    },
    sentimentDistribution: {
      positive: { type: Number, default: 0 },
      negative: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
    },

    languageBreakdown: {
      english: { type: Number, default: 0 },
      hindi: { type: Number, default: 0 },
      gujarati: { type: Number, default: 0 },
      mixed: { type: Number, default: 0 },
      unknown: { type: Number, default: 0 },
    },
    dominantLanguage: {
      type: String,
      enum: ['english', 'hindi', 'gujarati', 'mixed', 'unknown'],
      default: 'unknown',
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    processingError: {
      type: String,
    },
    analysisMetrics: {
      averageArticleLength: { type: Number, default: 0 },
      totalWordCount: { type: Number, default: 0 },
      readabilityScore: { type: Number, default: 0 },
      diversityIndex: { type: Number, default: 0 },
      qualityScore: { type: Number, default: 0 },
    },
    compiledReport: {
      summary: String,
      keyFindings: [String],
      sentimentAnalysis: String,
      languageAnalysis: String,
      topicsIdentified: [String],
      recommendations: [String],
      detailedInsights: mongoose.Schema.Types.Mixed,
    },
    reportGeneratedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
newspaperSchema.index({ userId: 1, createdAt: -1 })
newspaperSchema.index({ userId: 1, overallSentiment: 1 })
newspaperSchema.index({ userId: 1, processingStatus: 1 })

export default mongoose.model('Newspaper', newspaperSchema)

