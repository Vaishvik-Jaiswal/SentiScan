import asyncHandler from 'express-async-handler'
import NewsComparison from '../models/NewsComparison.js'
import Article from '../models/Article.js'
import sentimentAnalysis from '../services/sentimentAnalysis.js'

// @desc    Create a new news comparison
// @route   POST /api/news-comparison
// @access  Private
export const createNewsComparison = asyncHandler(async (req, res) => {
  const { comparisonTitle, description, articleCount } = req.body

  if (!comparisonTitle || !articleCount || articleCount < 2) {
    res.status(400)
    throw new Error('Comparison title and at least 2 articles are required')
  }

  if (articleCount > 10) {
    res.status(400)
    throw new Error('Maximum 10 articles allowed for comparison')
  }

  try {
    const newsComparison = await NewsComparison.create({
      userId: req.user._id,
      comparisonTitle: comparisonTitle.trim(),
      description: description?.trim() || '',
      articles: [], // Will be populated as articles are uploaded
      processingStatus: 'pending',
    })

    res.status(201).json({
      _id: newsComparison._id,
      comparisonTitle: newsComparison.comparisonTitle,
      description: newsComparison.description,
      expectedArticleCount: articleCount,
      currentArticleCount: 0,
      processingStatus: newsComparison.processingStatus,
      createdAt: newsComparison.createdAt,
    })
  } catch (error) {
    console.error('Error creating news comparison:', error)
    res.status(500)
    throw new Error('Failed to create news comparison')
  }
})

// @desc    Add article to news comparison
// @route   POST /api/news-comparison/:id/add-article
// @access  Private
export const addArticleToComparison = asyncHandler(async (req, res) => {
  const { newspaperName, articleId } = req.body
  const comparisonId = req.params.id

  if (!newspaperName || !articleId) {
    res.status(400)
    throw new Error('Newspaper name and article ID are required')
  }

  try {
    // Find the comparison
    const comparison = await NewsComparison.findOne({
      _id: comparisonId,
      userId: req.user._id,
    })

    if (!comparison) {
      res.status(404)
      throw new Error('News comparison not found')
    }

    // Verify the article belongs to the user
    const article = await Article.findOne({
      _id: articleId,
      userId: req.user._id,
    })

    if (!article) {
      res.status(404)
      throw new Error('Article not found')
    }

    // Check if newspaper already exists in this comparison
    const existingNewspaper = comparison.articles.find(
      a => a.newspaperName.toLowerCase() === newspaperName.toLowerCase()
    )

    if (existingNewspaper) {
      res.status(400)
      throw new Error('This newspaper has already been added to the comparison')
    }

    // Add article to comparison
    const uploadOrder = comparison.articles.length + 1
    comparison.articles.push({
      newspaperName: newspaperName.trim(),
      articleId: article._id,
      headline: article.heading,
      headingSentiment: article.headingSentiment,
      contentSentiment: article.contentSentiment,
      sentiment: article.headingSentiment || article.contentSentiment,
      headingSentimentReason: article.headingSentimentReason,
      contentSentimentReason: article.contentSentimentReason,
      sentimentReason: article.headingSentimentReason || article.contentSentimentReason,
      uploadOrder,
    })

    await comparison.save()

    res.json({
      _id: comparison._id,
      comparisonTitle: comparison.comparisonTitle,
      currentArticleCount: comparison.articles.length,
      articles: comparison.articles.map(a => ({
        newspaperName: a.newspaperName,
        headline: a.headline,
        sentiment: a.sentiment,
        uploadOrder: a.uploadOrder,
      })),
      processingStatus: comparison.processingStatus,
    })
  } catch (error) {
    console.error('Error adding article to comparison:', error)
    throw error
  }
})

// @desc    Start comparison analysis
// @route   POST /api/news-comparison/:id/analyze
// @access  Private
export const startComparisonAnalysis = asyncHandler(async (req, res) => {
  const comparisonId = req.params.id

  try {
    const comparison = await NewsComparison.findOne({
      _id: comparisonId,
      userId: req.user._id,
    }).populate('articles.articleId')

    if (!comparison) {
      res.status(404)
      throw new Error('News comparison not found')
    }

    if (comparison.articles.length < 2) {
      res.status(400)
      throw new Error('At least 2 articles are required for comparison')
    }

    // Update status to processing
    comparison.processingStatus = 'processing'
    await comparison.save()

    // Start background analysis
    processComparisonAnalysis(comparisonId)

    res.json({
      _id: comparison._id,
      processingStatus: 'processing',
      message: 'Analysis started. This may take a few minutes.',
    })
  } catch (error) {
    console.error('Error starting comparison analysis:', error)
    throw error
  }
})

// Background function to process comparison analysis
const processComparisonAnalysis = async (comparisonId) => {
  console.log(`🔍 Starting comparison analysis for ${comparisonId}...`)
  
  try {
    const comparison = await NewsComparison.findById(comparisonId).populate('articles.articleId')
    if (!comparison) {
      console.error(`❌ Comparison not found: ${comparisonId}`)
      return
    }

    const articles = comparison.articles.map(a => a.articleId)
    
    // Update comparison articles with latest sentiment data from populated articles
    const updatedArticles = comparison.articles.map((compArticle, index) => {
      const fullArticle = articles[index]
      return {
        ...compArticle.toObject(),
        headline: fullArticle.heading || compArticle.headline,
        headingSentiment: fullArticle.headingSentiment || compArticle.headingSentiment,
        contentSentiment: fullArticle.contentSentiment || compArticle.contentSentiment,
        sentiment: fullArticle.headingSentiment || fullArticle.contentSentiment || compArticle.sentiment,
        headingSentimentReason: fullArticle.headingSentimentReason || compArticle.headingSentimentReason,
        contentSentimentReason: fullArticle.contentSentimentReason || compArticle.contentSentimentReason,
        sentimentReason: fullArticle.headingSentimentReason || fullArticle.contentSentimentReason || compArticle.sentimentReason,
      }
    })
    
    // Update the comparison with latest data
    comparison.articles = updatedArticles
    await comparison.save()
    
    // Step 1: Analyze similarity between articles
    console.log(`📊 Analyzing similarity between ${articles.length} articles...`)
    const similarityAnalysis = await analyzeSimilarity(articles)
    
    // Step 2: Generate sentiment comparison
    console.log(`💭 Generating sentiment comparison...`)
    const sentimentComparison = generateSentimentComparison(comparison.articles)
    
    // Step 3: Generate compiled report
    console.log(`📝 Generating compiled report...`)
    const compiledReport = await generateCompiledReport(comparison, articles, similarityAnalysis, sentimentComparison)
    
    // Update comparison with results
    await NewsComparison.findByIdAndUpdate(comparisonId, {
      overallAnalysis: similarityAnalysis,
      sentimentSummary: sentimentComparison,
      compiledReport,
      reportGeneratedAt: new Date(),
      processingStatus: 'completed',
    })

    console.log(`✅ Comparison analysis completed for ${comparisonId}`)
  } catch (error) {
    console.error(`❌ Error processing comparison analysis for ${comparisonId}:`, error)
    
    await NewsComparison.findByIdAndUpdate(comparisonId, {
      processingStatus: 'failed',
      processingError: error.message,
    })
  }
}

// Helper function to analyze similarity between articles
const analyzeSimilarity = async (articles) => {
  try {
    // Enhanced keyword-based similarity analysis with error handling
    const allTexts = articles.map(article => `${article.heading || ''} ${article.content || ''}`.toLowerCase())
    
    // Remove common stop words and extract meaningful keywords
    const stopWords = new Set(['the', 'and', 'but', 'for', 'are', 'with', 'his', 'her', 'this', 'that', 'was', 'will', 'from', 'they', 'been', 'said', 'each', 'which', 'their', 'time', 'have', 'there', 'what', 'were', 'when', 'where', 'more', 'some', 'like', 'into', 'him', 'has', 'two', 'than', 'many', 'very', 'after', 'words', 'before', 'through', 'just', 'also', 'any', 'new', 'years', 'way', 'may', 'say', 'come', 'could', 'now', 'over', 'think', 'back', 'after', 'use', 'her', 'can', 'out', 'would', 'year', 'get', 'has', 'had', 'may'])
    
    // Extract meaningful words (length > 3, not stop words, not numbers)
    const allWords = allTexts.join(' ')
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 3 && 
        !stopWords.has(word.toLowerCase()) && 
        !/^\d+$/.test(word)
      )
      .map(word => word.toLowerCase())
    
    const wordCounts = {}
    allWords.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1
    })
    
    // Find words that appear in multiple articles (higher threshold for better accuracy)
    const commonKeywords = Object.entries(wordCounts)
      .filter(([word, count]) => count >= Math.min(articles.length, 2) && count >= articles.length * 0.4)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word)
    
    // Enhanced similarity calculation
    let similarityScore = 0
    
    // Base score from common keywords
    similarityScore += Math.min(50, commonKeywords.length * 3)
    
    // Bonus for high-frequency common words
    const highFreqWords = commonKeywords.filter(word => wordCounts[word] >= articles.length)
    similarityScore += highFreqWords.length * 5
    
    // Check for similar headlines
    const headlines = articles.map(a => (a.heading || '').toLowerCase())
    let headlineSimilarity = 0
    for (let i = 0; i < headlines.length; i++) {
      for (let j = i + 1; j < headlines.length; j++) {
        const h1Words = headlines[i].split(' ').filter(w => w.length > 3)
        const h2Words = headlines[j].split(' ').filter(w => w.length > 3)
        const commonHeadlineWords = h1Words.filter(w => h2Words.includes(w))
        headlineSimilarity += (commonHeadlineWords.length / Math.max(h1Words.length, h2Words.length)) * 100
      }
    }
    
    if (headlines.length > 1) {
      headlineSimilarity /= ((headlines.length * (headlines.length - 1)) / 2)
      similarityScore += headlineSimilarity * 0.3
    }
    
    // Cap at 100
    similarityScore = Math.min(100, Math.round(similarityScore))
    
    // Determine if it's the same news story with better thresholds
    const isSameNews = similarityScore > 40 || (commonKeywords.length > 8 && headlineSimilarity > 30)
    
    // Enhanced error detection for mismatched articles
    const mismatchWarnings = []
    
    // Check if articles are too dissimilar
    if (similarityScore < 20) {
      mismatchWarnings.push('Very low similarity detected - articles may be about different topics')
    }
    
    // Check if no common keywords
    if (commonKeywords.length < 3) {
      mismatchWarnings.push('Few common keywords found - verify articles are about the same news event')
    }
    
    // Check date consistency (if available)
    const dates = articles.map(a => a.createdAt || a.publishedDate).filter(d => d)
    if (dates.length > 1) {
      const dateRange = Math.abs(new Date(Math.max(...dates.map(d => new Date(d)))) - new Date(Math.min(...dates.map(d => new Date(d)))))
      if (dateRange > 7 * 24 * 60 * 60 * 1000) { // More than 7 days apart
        mismatchWarnings.push('Articles published more than a week apart - may not be about the same event')
      }
    }
    
    // Generate different perspectives with better analysis
    const differentPerspectives = articles.map((article, index) => {
      const sentiment = article.headingSentiment || article.contentSentiment || 'Neutral'
      const newspaper = articles.length > index && articles[index].newspaperName ? 
        articles[index].newspaperName : `Source ${index + 1}`
      return `${newspaper}: ${sentiment} perspective with focus on ${commonKeywords.slice(0, 3).join(', ') || 'general coverage'}`
    })

    return {
      similarityScore,
      isSameNews,
      commonKeywords,
      differentPerspectives,
      mismatchWarnings,
      qualityMetrics: {
        headlineSimilarity: Math.round(headlineSimilarity),
        keywordOverlap: commonKeywords.length,
        contentLength: articles.map(a => (a.content || '').length),
      }
    }
  } catch (error) {
    console.error('Error analyzing similarity:', error)
    return {
      similarityScore: 0,
      isSameNews: false,
      commonKeywords: [],
      differentPerspectives: [],
      mismatchWarnings: ['Error occurred during analysis - results may not be reliable'],
      qualityMetrics: {
        headlineSimilarity: 0,
        keywordOverlap: 0,
        contentLength: [],
      }
    }
  }
}

// Helper function to generate sentiment comparison
const generateSentimentComparison = (articles) => {
  try {
    const sentimentScores = {
      'Positive': 3,
      'Mixed': 2,
      'Neutral': 1,
      'Negative': 0,
    }
    
    let mostPositive = { newspaper: '', score: -1 }
    let mostNegative = { newspaper: '', score: 4 }
    let totalScore = 0
    
    articles.forEach(article => {
      const score = sentimentScores[article.sentiment] || 1
      totalScore += score
      
      if (score > mostPositive.score) {
        mostPositive = { newspaper: article.newspaperName, score }
      }
      
      if (score < mostNegative.score) {
        mostNegative = { newspaper: article.newspaperName, score }
      }
    })
    
    const averageScore = totalScore / articles.length
    const averageSentiment = averageScore >= 2.5 ? 'Positive' 
                           : averageScore >= 1.5 ? 'Mixed'
                           : averageScore >= 0.5 ? 'Neutral' 
                           : 'Negative'
    
    return {
      mostPositive,
      mostNegative,
      averageSentiment,
    }
  } catch (error) {
    console.error('Error generating sentiment comparison:', error)
    return {
      mostPositive: { newspaper: 'Unknown', score: 0 },
      mostNegative: { newspaper: 'Unknown', score: 0 },
      averageSentiment: 'Neutral',
    }
  }
}

// Helper function to generate compiled report
const generateCompiledReport = async (comparison, articles, similarityAnalysis, sentimentComparison) => {
  try {
    // Generate summary
    const summary = `Analysis of "${comparison.comparisonTitle}" across ${articles.length} different newspapers. ` +
      `The articles show ${similarityAnalysis?.isSameNews ? 'high similarity' : 'different perspectives'} ` +
      `on the same topic with varying sentiment approaches.`
    
    // Analyze each newspaper's perspective
    const newspaperAnalysis = comparison.articles.map((compArticle, index) => {
      const article = articles[index]
      const sentiment = compArticle.sentiment || 'Neutral'
      
      // Simple bias detection based on sentiment and keywords
      let bias = 'Neutral'
      if (sentiment === 'Positive') bias = 'Positive bias'
      else if (sentiment === 'Negative') bias = 'Negative bias'
      else if (sentiment === 'Mixed') bias = 'Balanced perspective'
      
      // Extract key points (simplified)
      const keyPoints = [
        `Headline: ${compArticle.headline}`,
        `Overall sentiment: ${sentiment}`,
        `Content length: ${article.content?.length || 0} characters`,
      ]
      
      return {
        newspaper: compArticle.newspaperName,
        perspective: `${sentiment} perspective on the topic`,
        bias,
        keyPoints,
      }
    })
    
    // Generate conclusions
    const conclusions = [
      `${comparison.articles.length} newspapers covered this topic`,
      `Similarity score: ${similarityAnalysis?.similarityScore || 0}%`,
      `${similarityAnalysis?.isSameNews ? 'Same news story' : 'Different angles'} detected`,
      `Average sentiment: ${sentimentComparison?.averageSentiment || 'Neutral'}`,
    ]
    
    // Generate AI remarks for comparison
    const aiRemarks = generateAIRemarks(comparison, articles, similarityAnalysis, sentimentComparison)
    
    return {
      summary,
      newspaperAnalysis,
      conclusions,
      aiRemarks,
    }
  } catch (error) {
    console.error('Error generating compiled report:', error)
    return {
      summary: 'Error generating report summary',
      newspaperAnalysis: [],
      conclusions: ['Error processing analysis'],
      aiRemarks: {
        overallAssessment: 'Error generating AI assessment',
        sentimentAnalysis: 'Error analyzing sentiment patterns',
        biasDetection: 'Error detecting bias patterns',
        recommendations: ['Error generating recommendations'],
        keyInsights: ['Error generating insights']
      }
    }
  }
}

// Helper function to generate AI remarks
const generateAIRemarks = (comparison, articles, similarityAnalysis, sentimentComparison) => {
  try {
    // Overall Assessment
    const overallAssessment = generateOverallAssessment(comparison, similarityAnalysis, sentimentComparison)
    
    // Sentiment Analysis Remarks
    const sentimentAnalysis = generateSentimentAnalysisRemarks(comparison.articles, sentimentComparison)
    
    // Bias Detection
    const biasDetection = generateBiasDetectionRemarks(comparison.articles)
    
    // Recommendations
    const recommendations = generateRecommendations(comparison, similarityAnalysis, sentimentComparison)
    
    // Key Insights
    const keyInsights = generateKeyInsights(comparison, articles, similarityAnalysis)

    return {
      overallAssessment,
      sentimentAnalysis,
      biasDetection,
      recommendations,
      keyInsights
    }
  } catch (error) {
    console.error('Error generating AI remarks:', error)
    return {
      overallAssessment: 'Error generating AI assessment',
      sentimentAnalysis: 'Error analyzing sentiment patterns',
      biasDetection: 'Error detecting bias patterns',
      recommendations: ['Error generating recommendations'],
      keyInsights: ['Error generating insights']
    }
  }
}

const generateOverallAssessment = (comparison, similarityAnalysis, sentimentComparison) => {
  const articleCount = comparison.articles.length
  const similarityScore = similarityAnalysis?.similarityScore || 0
  const isSameNews = similarityAnalysis?.isSameNews
  const avgSentiment = sentimentComparison?.averageSentiment

  let assessment = `After analyzing ${articleCount} news articles, `
  
  if (isSameNews) {
    assessment += `our AI confirms these articles cover the same news story with ${similarityScore}% content similarity. `
  } else {
    assessment += `our AI detected these articles cover different aspects or events with only ${similarityScore}% content overlap. `
  }
  
  assessment += `The overall sentiment across all sources is ${avgSentiment?.toLowerCase() || 'neutral'}, indicating `
  
  switch (avgSentiment) {
    case 'Positive':
      assessment += 'a generally optimistic or favorable coverage of the topic.'
      break
    case 'Negative':
      assessment += 'predominantly critical or unfavorable coverage of the topic.'
      break
    case 'Mixed':
      assessment += 'varied perspectives with both positive and negative elements.'
      break
    default:
      assessment += 'balanced, objective reporting across the sources.'
  }

  return assessment
}

const generateSentimentAnalysisRemarks = (articles, sentimentComparison) => {
  const sentimentCounts = {
    'Positive': 0,
    'Negative': 0,
    'Neutral': 0,
    'Mixed': 0
  }
  
  articles.forEach(article => {
    if (article.headingSentiment) sentimentCounts[article.headingSentiment]++
    if (article.contentSentiment) sentimentCounts[article.contentSentiment]++
  })
  
  const totalSentiments = Object.values(sentimentCounts).reduce((a, b) => a + b, 0)
  const dominantSentiment = Object.entries(sentimentCounts)
    .sort((a, b) => b[1] - a[1])[0][0]
  
  let analysis = `Sentiment analysis reveals ${dominantSentiment.toLowerCase()} sentiment dominates the coverage. `
  
  if (sentimentComparison?.mostPositive && sentimentComparison?.mostNegative) {
    analysis += `${sentimentComparison.mostPositive.newspaper} shows the most positive coverage, while ${sentimentComparison.mostNegative.newspaper} presents more critical perspectives. `
  }
  
  const sentimentVariety = Object.values(sentimentCounts).filter(count => count > 0).length
  if (sentimentVariety >= 3) {
    analysis += 'The diversity in sentiment suggests different editorial stances or varying aspects of the story being emphasized.'
  } else {
    analysis += 'The limited sentiment variation indicates general consensus in how the story is being presented.'
  }
  
  return analysis
}

const generateBiasDetectionRemarks = (articles) => {
  // Analyze sentiment differences between headline and content
  let biasIndicators = []
  let headlineContentMismatches = 0
  
  articles.forEach(article => {
    if (article.headingSentiment && article.contentSentiment) {
      if (article.headingSentiment !== article.contentSentiment) {
        headlineContentMismatches++
        biasIndicators.push(`${article.newspaperName}: Headline (${article.headingSentiment}) vs Content (${article.contentSentiment})`)
      }
    }
  })
  
  let biasAnalysis = 'AI bias detection analysis: '
  
  if (headlineContentMismatches === 0) {
    biasAnalysis += 'Headlines and content sentiment align consistently across all sources, suggesting balanced reporting.'
  } else if (headlineContentMismatches === 1) {
    biasAnalysis += `One source shows sentiment mismatch between headline and content, which may indicate editorial emphasis or clickbait tendencies.`
  } else {
    biasAnalysis += `${headlineContentMismatches} sources show sentiment mismatches between headlines and content, suggesting potential editorial bias or sensationalized headlines.`
  }
  
  if (biasIndicators.length > 0) {
    biasAnalysis += ` Specific mismatches detected: ${biasIndicators.join('; ')}.`
  }
  
  return biasAnalysis
}

const generateRecommendations = (comparison, similarityAnalysis, sentimentComparison) => {
  const recommendations = []
  
  // Content similarity recommendations
  if (similarityAnalysis?.similarityScore < 30) {
    recommendations.push('Consider verifying if all articles cover the same news event, as content similarity is low')
  }
  
  // Sentiment diversity recommendations
  if (sentimentComparison?.mostPositive && sentimentComparison?.mostNegative) {
    recommendations.push(`For balanced perspective, compare ${sentimentComparison.mostPositive.newspaper} and ${sentimentComparison.mostNegative.newspaper} coverage`)
  }
  
  // Quality recommendations
  if (similarityAnalysis?.qualityMetrics?.keywordOverlap < 5) {
    recommendations.push('Low keyword overlap suggests articles may be covering different aspects - consider more focused comparison')
  }
  
  // General recommendations
  recommendations.push('Cross-reference facts and claims across all sources for comprehensive understanding')
  recommendations.push('Pay attention to headline vs content sentiment differences for potential bias detection')
  
  if (comparison.articles.length < 4) {
    recommendations.push('Consider adding more sources for a more comprehensive media landscape analysis')
  }
  
  return recommendations
}

const generateKeyInsights = (comparison, articles, similarityAnalysis) => {
  const insights = []
  
  // Similarity insights
  if (similarityAnalysis?.isSameNews) {
    insights.push(`High content similarity (${similarityAnalysis.similarityScore}%) confirms same news story coverage`)
  } else {
    insights.push(`Low similarity suggests different events or angles being covered`)
  }
  
  // Content quality insights
  const avgContentLength = articles.reduce((sum, article) => sum + (article.content?.length || 0), 0) / articles.length
  if (avgContentLength > 2000) {
    insights.push('In-depth coverage detected with comprehensive content analysis')
  } else if (avgContentLength < 500) {
    insights.push('Brief coverage detected - may indicate breaking news or summary reporting')
  }
  
  // Language and keyword insights
  if (similarityAnalysis?.commonKeywords?.length > 10) {
    insights.push(`Rich keyword overlap (${similarityAnalysis.commonKeywords.length} common terms) indicates focused topic coverage`)
  }
  
  // Temporal insights
  const newspapers = comparison.articles.map(a => a.newspaperName)
  const uniqueTypes = [...new Set(newspapers.map(name => {
    if (name.toLowerCase().includes('tv') || name.toLowerCase().includes('news')) return 'broadcast'
    if (name.toLowerCase().includes('times') || name.toLowerCase().includes('post')) return 'newspaper'
    if (name.toLowerCase().includes('online') || name.toLowerCase().includes('.com')) return 'digital'
    return 'traditional'
  }))]
  
  if (uniqueTypes.length > 1) {
    insights.push(`Cross-media analysis includes ${uniqueTypes.join(', ')} sources for comprehensive perspective`)
  }
  
  return insights
}

// @desc    Get user's news comparisons
// @route   GET /api/news-comparison
// @access  Private
export const getUserComparisons = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const skip = (page - 1) * limit

  const comparisons = await NewsComparison.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-compiledReport') // Exclude large report data for list view

  const total = await NewsComparison.countDocuments({ userId: req.user._id })

  res.json({
    comparisons,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
})

// @desc    Get news comparison by ID
// @route   GET /api/news-comparison/:id
// @access  Private
export const getComparisonById = asyncHandler(async (req, res) => {
  const comparison = await NewsComparison.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).populate('articles.articleId')

  if (!comparison) {
    res.status(404)
    throw new Error('News comparison not found')
  }

  // Update comparison articles with latest sentiment data from populated articles
  if (comparison.articles && comparison.articles.length > 0) {
    const updatedArticles = comparison.articles.map((compArticle) => {
      const fullArticle = compArticle.articleId
      if (fullArticle) {
        return {
          ...compArticle.toObject(),
          headline: fullArticle.heading || compArticle.headline,
          sentiment: fullArticle.headingSentiment || fullArticle.contentSentiment || compArticle.sentiment,
          sentimentReason: fullArticle.headingSentimentReason || fullArticle.contentSentimentReason || compArticle.sentimentReason,
        }
      }
      return compArticle.toObject()
    })
    
    // Update and save if there are changes
    const hasChanges = updatedArticles.some((updated, index) => 
      updated.sentiment !== comparison.articles[index].sentiment ||
      updated.headline !== comparison.articles[index].headline
    )
    
    if (hasChanges) {
      comparison.articles = updatedArticles
      await comparison.save()
    }
  }

  res.json(comparison)
})

// @desc    Delete news comparison
// @route   DELETE /api/news-comparison/:id
// @access  Private
export const deleteComparison = asyncHandler(async (req, res) => {
  const comparison = await NewsComparison.findOne({
    _id: req.params.id,
    userId: req.user._id,
  })

  if (!comparison) {
    res.status(404)
    throw new Error('News comparison not found')
  }

  await NewsComparison.findByIdAndDelete(req.params.id)

  res.json({ message: 'News comparison deleted successfully' })
})
