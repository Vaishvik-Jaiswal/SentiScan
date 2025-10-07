import mongoose from 'mongoose'

const newsComparisonSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    comparisonTitle: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    articles: [{
      newspaperName: {
        type: String,
        required: true,
        trim: true,
      },
      articleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article',
        required: true,
      },
      // Store key extracted information for quick access
      headline: String,
      headingSentiment: {
        type: String,
        enum: ['Positive', 'Negative', 'Neutral'],
      },
      contentSentiment: {
        type: String,
        enum: ['Positive', 'Negative', 'Neutral'],
      },
      sentiment: {
        type: String,
        enum: ['Positive', 'Negative', 'Neutral'],
      },
      headingSentimentReason: String,
      contentSentimentReason: String,
      sentimentReason: String,
      uploadOrder: {
        type: Number,
        required: true,
      }
    }],
    // Analysis results
    overallAnalysis: {
      similarityScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      isSameNews: {
        type: Boolean,
        default: false,
      },
      commonKeywords: [String],
      differentPerspectives: [String],
      mismatchWarnings: [String],
      qualityMetrics: {
        headlineSimilarity: {
          type: Number,
          default: 0,
        },
        keywordOverlap: {
          type: Number,
          default: 0,
        },
        contentLength: [Number],
      },
    },
    // Sentiment comparison summary
    sentimentSummary: {
      mostPositive: {
        newspaper: String,
        score: Number,
      },
      mostNegative: {
        newspaper: String,
        score: Number,
      },
      averageSentiment: {
        type: String,
        enum: ['Positive', 'Negative', 'Neutral'],
      },
    },
    // Processing status
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    processingError: String,
    // Report generation
    compiledReport: {
      summary: String,
      newspaperAnalysis: [{
        newspaper: String,
        perspective: String,
        bias: String,
        keyPoints: [String],
      }],
      conclusions: [String],
    },
    reportGeneratedAt: Date,
  },
  {
    timestamps: true,
  }
)

// Indexes for better performance
newsComparisonSchema.index({ userId: 1, createdAt: -1 })
newsComparisonSchema.index({ userId: 1, processingStatus: 1 })

const NewsComparison = mongoose.model('NewsComparison', newsComparisonSchema)
export default NewsComparison
