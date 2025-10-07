import asyncHandler from 'express-async-handler'
import NewsComparison from '../models/NewsComparison.js'
import Article from '../models/Article.js'
import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import { ChartJSNodeCanvas } from 'chartjs-node-canvas'
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
      'Positive': 2,
      'Neutral': 1,
      'Negative': 0,
    }
    
    let mostPositive = { newspaper: '', score: -1 }
    let mostNegative = { newspaper: '', score: 3 }
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
    const averageSentiment = averageScore >= 1.5 ? 'Positive' 
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
      else if (sentiment === 'Neutral') bias = 'Balanced perspective'
      
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
    const aiRemarks = await generateAIRemarks(comparison, articles, similarityAnalysis, sentimentComparison)
    
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

// Helper function to generate AI remarks with enhanced analysis
const generateAIRemarks = async (comparison, articles, similarityAnalysis, sentimentComparison) => {
  try {
    console.log('🤖 Generating enhanced AI analysis for news comparison...')
    
    // Generate detailed AI analysis using OpenAI
    const detailedAnalysis = await generateDetailedAIAnalysis(comparison, articles, similarityAnalysis, sentimentComparison)
    
    // Generate visualization data for charts
    console.log('📊 Generating visualization data for charts...')
    const visualizationData = generateVisualizationData(comparison, articles, similarityAnalysis, sentimentComparison)
    console.log('✅ Visualization data generated:', Object.keys(visualizationData))
    
    // Generate basic analysis as fallback
    const basicAnalysis = {
      overallAssessment: generateOverallAssessment(comparison, similarityAnalysis, sentimentComparison),
      sentimentAnalysis: generateSentimentAnalysisRemarks(comparison.articles, sentimentComparison),
      biasDetection: generateBiasDetectionRemarks(comparison.articles),
      recommendations: generateRecommendations(comparison, similarityAnalysis, sentimentComparison),
      keyInsights: generateKeyInsights(comparison, articles, similarityAnalysis)
    }

    return {
      ...basicAnalysis,
      detailedAnalysis,
      visualizationData,
      analysisMetrics: generateAnalysisMetrics(comparison, articles, similarityAnalysis)
    }
  } catch (error) {
    console.error('Error generating AI remarks:', error)
    return {
      overallAssessment: 'Error generating AI assessment',
      sentimentAnalysis: 'Error analyzing sentiment patterns',
      biasDetection: 'Error detecting bias patterns',
      recommendations: ['Error generating recommendations'],
      keyInsights: ['Error generating insights'],
      visualizationData: null,
      detailedAnalysis: null
    }
  }
}

// Enhanced AI analysis using OpenAI
const generateDetailedAIAnalysis = async (comparison, articles, similarityAnalysis, sentimentComparison) => {
  try {
    // Prepare data for AI analysis
    const analysisData = {
      articles: articles.map((article, index) => ({
        newspaper: comparison.articles[index]?.newspaperName || 'Unknown',
        headline: article.heading,
        content: article.content.substring(0, 1500), // First 1500 chars for context
        headingSentiment: article.headingSentiment,
        contentSentiment: article.contentSentiment,
        headingSentimentReason: article.headingSentimentReason,
        contentSentimentReason: article.contentSentimentReason,
        language: article.language,
        publishedDate: article.createdAt
      })),
      similarityScore: similarityAnalysis?.similarityScore || 0,
      commonKeywords: similarityAnalysis?.commonKeywords || [],
      isSameNews: similarityAnalysis?.isSameNews || false,
      mismatchWarnings: similarityAnalysis?.mismatchWarnings || []
    }

    const prompt = `
Analyze these news articles and provide a comprehensive comparison report in JSON format:

${JSON.stringify(analysisData, null, 2)}

Provide analysis in this exact JSON structure:
{
  "detailedComparison": {
    "similarities": ["Specific similarities found between articles"],
    "differences": ["Key differences in reporting approach"],
    "uniqueAngles": ["Unique perspectives each newspaper brings"],
    "factualConsistency": "Analysis of factual consistency",
    "coverageDepth": "Assessment of coverage depth across sources"
  },
  "journalisticQuality": {
    "objectivityScore": 85,
    "credibilityAssessment": "High/Medium/Low with explanation",
    "sourceQuality": "Assessment of source quality",
    "editorialBalance": "Analysis of editorial balance"
  },
  "narrativeAnalysis": {
    "dominantNarrative": "Main story narrative",
    "alternativeNarratives": ["Alternative perspectives presented"],
    "framingDifferences": ["How each source frames the story"],
    "contextualFactors": ["Important contextual factors"]
  },
  "impactAssessment": {
    "publicInterest": "Assessment of public interest level",
    "stakeholderImpact": ["Who is most affected by this story"],
    "longTermImplications": ["Potential long-term implications"],
    "actionableInsights": ["What readers should know or do"]
  }
}

Focus on providing specific, actionable insights with examples from the articles.
`;

    // Check if Azure OpenAI configuration is available
    if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
      console.warn('⚠️ Azure OpenAI configuration not found, skipping detailed AI analysis')
      return null
    }

    const azureEndpoint = `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`

    const response = await fetch(azureEndpoint, {
      method: 'POST',
      headers: {
        'api-key': process.env.AZURE_OPENAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are an expert media analyst specializing in news comparison, bias detection, and journalistic quality assessment. Provide detailed, objective analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2500,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenAI API error: ${response.status} - ${errorText}`)
      if (response.status === 401) {
        console.error('❌ Azure OpenAI API authentication failed. Please check your API key and endpoint configuration.')
      }
      return null
    }

    const data = await response.json()
    const analysisText = data.choices[0].message.content

    // Parse the JSON response
    try {
      // Clean the response text to handle markdown formatting
      let cleanedText = analysisText.trim()
      
      // Remove markdown code blocks if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      const analysis = JSON.parse(cleanedText)
      console.log('✅ Detailed AI analysis generated successfully')
      return analysis
    } catch (parseError) {
      console.error('❌ Error parsing AI analysis JSON:', parseError.message)
      console.error('Raw response:', analysisText.substring(0, 500) + '...')
      return null
    }

  } catch (error) {
    console.error('❌ OpenAI API error:', error.message)
    return null
  }
}

// Generate visualization data for charts and graphs
const generateVisualizationData = (comparison, articles, similarityAnalysis, sentimentComparison) => {
  const newspapers = comparison.articles.map(a => a.newspaperName)
  
  return {
    sentimentDistribution: {
      labels: newspapers,
      datasets: [
        {
          label: 'Headline Sentiment',
          data: comparison.articles.map(a => getSentimentScore(a.headingSentiment)),
          backgroundColor: comparison.articles.map(a => getSentimentColor(a.headingSentiment, 0.6)),
          borderColor: comparison.articles.map(a => getSentimentColor(a.headingSentiment, 1)),
          borderWidth: 2
        },
        {
          label: 'Content Sentiment',
          data: comparison.articles.map(a => getSentimentScore(a.contentSentiment)),
          backgroundColor: comparison.articles.map(a => getSentimentColor(a.contentSentiment, 0.6)),
          borderColor: comparison.articles.map(a => getSentimentColor(a.contentSentiment, 1)),
          borderWidth: 2
        }
      ]
    },
    similarityMetrics: {
      labels: ['Overall Similarity', 'Keyword Overlap', 'Headline Similarity', 'Content Structure'],
      data: [
        similarityAnalysis?.similarityScore || 0,
        similarityAnalysis?.qualityMetrics?.keywordOverlap || 0,
        similarityAnalysis?.qualityMetrics?.headlineSimilarity || 0,
        Math.min(100, (similarityAnalysis?.commonKeywords?.length || 0) * 10)
      ],
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
    },
    wordFrequency: generateWordFrequencyData(articles),
    biasAnalysis: {
      labels: newspapers,
      data: comparison.articles.map(article => {
        const headingScore = getSentimentScore(article.headingSentiment)
        const contentScore = getSentimentScore(article.contentSentiment)
        return Math.abs(headingScore - contentScore) * 100 // Bias indicator
      }),
      backgroundColor: 'rgba(239, 68, 68, 0.6)',
      borderColor: 'rgba(239, 68, 68, 1)'
    },
    coverageMetrics: {
      labels: newspapers,
      datasets: [
        {
          label: 'Content Length (words)',
          data: articles.map(article => article.content.split(' ').length),
          backgroundColor: 'rgba(59, 130, 246, 0.6)'
        },
        {
          label: 'Headline Length (words)',
          data: articles.map(article => article.heading.split(' ').length),
          backgroundColor: 'rgba(16, 185, 129, 0.6)'
        }
      ]
    }
  }
}

// Generate analysis metrics
const generateAnalysisMetrics = (comparison, articles, similarityAnalysis) => {
  return {
    totalArticles: articles.length,
    averageContentLength: Math.round(articles.reduce((sum, article) => sum + article.content.length, 0) / articles.length),
    similarityScore: similarityAnalysis?.similarityScore || 0,
    commonKeywordsCount: similarityAnalysis?.commonKeywords?.length || 0,
    sentimentConsistency: calculateSentimentConsistency(comparison.articles),
    qualityScore: calculateOverallQualityScore(comparison, articles, similarityAnalysis),
    biasIndicators: calculateBiasIndicators(comparison.articles)
  }
}

// Helper functions for visualization
const getSentimentScore = (sentiment) => {
  const scores = { 'Positive': 1, 'Neutral': 0, 'Negative': -1 }
  return scores[sentiment] || 0
}

const getSentimentColor = (sentiment, alpha = 1) => {
  const colors = {
    'Positive': `rgba(34, 197, 94, ${alpha})`,
    'Negative': `rgba(239, 68, 68, ${alpha})`,
    'Neutral': `rgba(156, 163, 175, ${alpha})`,
  }
  return colors[sentiment] || `rgba(156, 163, 175, ${alpha})`
}

const generateWordFrequencyData = (articles) => {
  const wordCounts = {}
  const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'will', 'with', 'have', 'this', 'that', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'])
  
  articles.forEach(article => {
    const text = (article.heading + ' ' + article.content).toLowerCase()
    const words = text.replace(/[^\w\s]/g, '').split(/\s+/)
    
    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1
      }
    })
  })
  
  const sortedWords = Object.entries(wordCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 15)
  
  return {
    labels: sortedWords.map(([word]) => word),
    data: sortedWords.map(([,count]) => count),
    backgroundColor: sortedWords.map((_, i) => `hsl(${i * 25}, 70%, 60%)`)
  }
}

const calculateSentimentConsistency = (articles) => {
  if (articles.length < 2) return 100
  
  const sentiments = articles.map(a => a.sentiment).filter(Boolean)
  const uniqueSentiments = new Set(sentiments)
  
  return Math.round((1 - (uniqueSentiments.size - 1) / Math.max(1, sentiments.length - 1)) * 100)
}

const calculateOverallQualityScore = (comparison, articles, similarityAnalysis) => {
  let score = 0
  
  // Content quality (40%)
  const avgContentLength = articles.reduce((sum, article) => sum + article.content.length, 0) / articles.length
  score += Math.min(40, avgContentLength / 100)
  
  // Similarity appropriateness (30%)
  const similarityScore = similarityAnalysis?.similarityScore || 0
  score += (similarityScore > 70) ? 30 : (similarityScore * 0.3)
  
  // Sentiment analysis quality (30%)
  const hasValidSentiments = articles.every(article => article.headingSentiment && article.contentSentiment)
  score += hasValidSentiments ? 30 : 15
  
  return Math.round(score)
}

const calculateBiasIndicators = (articles) => {
  return articles.map(article => {
    const headingScore = getSentimentScore(article.headingSentiment)
    const contentScore = getSentimentScore(article.contentSentiment)
    const bias = Math.abs(headingScore - contentScore)
    
    return {
      newspaper: article.newspaperName,
      biasLevel: bias > 0.5 ? 'High' : bias > 0.25 ? 'Medium' : 'Low',
      biasScore: Math.round(bias * 100)
    }
  })
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

// @desc    Generate PDF report for news comparison
// @route   GET /api/news-comparison/:id/pdf-report
// @access  Private
export const generatePDFReport = asyncHandler(async (req, res) => {
  const comparison = await NewsComparison.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).populate('articles.articleId')

  if (!comparison) {
    res.status(404)
    throw new Error('News comparison not found')
  }

  try {
    console.log('📄 Generating PDF report for comparison:', comparison._id)
    
    // Get the compiled report with all analysis
    const articles = comparison.articles.map(a => a.articleId).filter(Boolean)
    const similarityAnalysis = await analyzeSimilarity(articles)
    const sentimentComparison = generateSentimentComparison(comparison.articles)
    const report = await generateCompiledReport(comparison, articles, similarityAnalysis, sentimentComparison)
    
    // Generate chart images
    const chartImages = await generateChartImages(report)
    
    // Generate HTML content for PDF
    const htmlContent = await generateReportHTML(comparison, articles, report, similarityAnalysis, chartImages)
    
    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    })
    
    await browser.close()
    
    // Set response headers for PDF download
    const filename = `news-comparison-report-${comparison._id}-${new Date().toISOString().split('T')[0]}.pdf`
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    
    res.send(pdfBuffer)
    
  } catch (error) {
    console.error('Error generating PDF report:', error)
    res.status(500)
    throw new Error('Failed to generate PDF report')
  }
})

// Generate chart images for PDF report
const generateChartImages = async (report) => {
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 800, height: 400 })
  const charts = {}

  try {
    // Sentiment Distribution Chart
    if (report.aiRemarks?.visualizationData?.sentimentDistribution) {
      const sentimentChart = {
        type: 'bar',
        data: report.aiRemarks.visualizationData.sentimentDistribution,
        options: {
          responsive: false,
          plugins: {
            title: {
              display: true,
              text: 'Sentiment Distribution Across Newspapers',
              font: { size: 16 }
            },
            legend: {
              position: 'top'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              min: -1,
              max: 1,
              ticks: {
                callback: function(value) {
                  return value === 1 ? 'Positive' : value === 0 ? 'Neutral' : value === -1 ? 'Negative' : value;
                }
              }
            }
          }
        }
      }
      charts.sentimentChart = await chartJSNodeCanvas.renderToBuffer(sentimentChart)
    }

    // Similarity Metrics Radar Chart
    if (report.aiRemarks?.visualizationData?.similarityMetrics) {
      const radarChart = {
        type: 'radar',
        data: {
          labels: report.aiRemarks.visualizationData.similarityMetrics.labels,
          datasets: [{
            label: 'Similarity Score',
            data: report.aiRemarks.visualizationData.similarityMetrics.data,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2
          }]
        },
        options: {
          responsive: false,
          plugins: {
            title: {
              display: true,
              text: 'Similarity Metrics Analysis',
              font: { size: 16 }
            }
          },
          scales: {
            r: {
              beginAtZero: true,
              max: 100
            }
          }
        }
      }
      charts.radarChart = await chartJSNodeCanvas.renderToBuffer(radarChart)
    }

    // Word Frequency Chart
    if (report.aiRemarks?.visualizationData?.wordFrequency) {
      const wordChart = {
        type: 'bar',
        data: {
          labels: report.aiRemarks.visualizationData.wordFrequency.labels,
          datasets: [{
            label: 'Frequency',
            data: report.aiRemarks.visualizationData.wordFrequency.data,
            backgroundColor: report.aiRemarks.visualizationData.wordFrequency.backgroundColor,
            borderWidth: 1
          }]
        },
        options: {
          responsive: false,
          plugins: {
            title: {
              display: true,
              text: 'Most Common Words Across Articles',
              font: { size: 16 }
            },
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      }
      charts.wordChart = await chartJSNodeCanvas.renderToBuffer(wordChart)
    }

    // Bias Analysis Chart
    if (report.aiRemarks?.visualizationData?.biasAnalysis) {
      const biasChart = {
        type: 'bar',
        data: {
          labels: report.aiRemarks.visualizationData.biasAnalysis.labels,
          datasets: [{
            label: 'Bias Score',
            data: report.aiRemarks.visualizationData.biasAnalysis.data,
            backgroundColor: 'rgba(239, 68, 68, 0.6)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: false,
          plugins: {
            title: {
              display: true,
              text: 'Bias Indicators (Headline vs Content Sentiment)',
              font: { size: 16 }
            },
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100
            }
          }
        }
      }
      charts.biasChart = await chartJSNodeCanvas.renderToBuffer(biasChart)
    }

    return charts
  } catch (error) {
    console.error('Error generating charts:', error)
    return {}
  }
}

// Generate HTML content for PDF report
const generateReportHTML = async (comparison, articles, report, similarityAnalysis, chartImages = {}) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  // Convert chart images to base64 for embedding
  const chartBase64 = {}
  for (const [key, buffer] of Object.entries(chartImages)) {
    if (buffer) {
      chartBase64[key] = `data:image/png;base64,${buffer.toString('base64')}`
    }
  }
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>News Comparison Analysis Report | SentiScan AI</title>
    <style>
        @page {
            margin: 1.5cm;
            size: A4;
            @bottom-left {
                content: "SentiScan AI Analysis Report";
                font-size: 10px;
                color: #666;
            }
            @bottom-right {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 10px;
                color: #666;
            }
            @top-center {
                content: "";
                border-bottom: 1px solid #e0e0e0;
                margin-bottom: 1cm;
            }
        }
        
        :root {
            --primary-color: #1a365d;
            --secondary-color: #2c5aa0;
            --accent-color: #4299e1;
            --success-color: #38a169;
            --warning-color: #d69e2e;
            --danger-color: #e53e3e;
            --dark-color: #2d3748;
            --light-color: #f7fafc;
            --text-color: #2d3748;
            --border-color: #e2e8f0;
            --shadow: 0 2px 4px rgba(0,0,0,0.08);
            --border-radius: 6px;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.5;
            color: var(--text-color);
            background: #ffffff;
            font-size: 12px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .header {
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            color: white;
            padding: 40px 0;
            text-align: center;
            margin-bottom: 30px;
            position: relative;
            page-break-after: avoid;
        }
        
        .header::after {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 4px;
            background: var(--accent-color);
            border-radius: 2px;
        }
        
        .header-content {
            max-width: 800px;
            margin: 0 auto;
            padding: 0 30px;
        }
        
        .header h1 {
            font-size: 2.2em;
            margin-bottom: 10px;
            font-weight: 300;
            letter-spacing: -0.5px;
        }
        
        .header .subtitle {
            font-size: 1.1em;
            opacity: 0.9;
            margin-bottom: 8px;
            font-weight: 300;
        }
        
        .report-meta {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 15px;
            font-size: 0.85em;
            opacity: 0.8;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 0 30px;
        }
        
        .section {
            margin-bottom: 35px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 1.4em;
            color: var(--primary-color);
            border-bottom: 2px solid var(--accent-color);
            padding-bottom: 8px;
            margin-bottom: 20px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            page-break-after: avoid;
        }
        
        .section-title::before {
            font-size: 1em;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .metric-card {
            background: white;
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            padding: 20px 15px;
            text-align: center;
            box-shadow: var(--shadow);
        }
        
        .metric-value {
            font-size: 2em;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: 5px;
            line-height: 1;
        }
        
        .metric-label {
            color: #718096;
            font-size: 0.85em;
            font-weight: 500;
        }
        
        .key-insight {
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            color: white;
            padding: 20px;
            border-radius: var(--border-radius);
            margin: 20px 0;
            page-break-inside: avoid;
        }
        
        .key-insight h3 {
            margin-bottom: 10px;
            font-size: 1.2em;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .key-insight p {
            font-size: 1em;
            line-height: 1.4;
        }
        
        .analysis-section {
            background: var(--light-color);
            border-left: 3px solid var(--accent-color);
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 var(--border-radius) var(--border-radius) 0;
            page-break-inside: avoid;
        }
        
        .analysis-title {
            font-size: 1.1em;
            color: var(--dark-color);
            margin-bottom: 12px;
            font-weight: 600;
        }
        
        .analysis-content {
            line-height: 1.6;
            font-size: 0.95em;
        }
        
        .newspaper-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 20px;
            margin: 20px 0;
            page-break-inside: avoid;
        }
        
        .newspaper-card {
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            padding: 20px;
            background: white;
            box-shadow: var(--shadow);
            page-break-inside: avoid;
        }
        
        .newspaper-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            border-bottom: 1px solid #e9ecef;
            padding-bottom: 12px;
        }
        
        .newspaper-name {
            font-size: 1.1em;
            font-weight: 700;
            color: var(--dark-color);
        }
        
        .sentiment-indicators {
            display: flex;
            gap: 6px;
        }
        
        .sentiment-badge {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.7em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .sentiment-positive { background: #c6f6d5; color: #22543d; border: 1px solid #9ae6b4; }
        .sentiment-negative { background: #fed7d7; color: #742a2a; border: 1px solid #feb2b2; }
        .sentiment-neutral { background: #e2e8f0; color: #2d3748; border: 1px solid #cbd5e0; }
        
        .article-headline {
            font-size: 1em;
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--dark-color);
            line-height: 1.3;
        }
        
        .article-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin: 15px 0;
            font-size: 0.85em;
        }
        
        .stat {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }
        
        .stat-label {
            color: #718096;
            font-size: 0.75em;
            margin-bottom: 3px;
        }
        
        .stat-value {
            font-weight: 700;
            color: var(--dark-color);
        }
        
        .download-link {
            text-align: center;
            margin-top: 15px;
        }
        
        .download-btn {
            background: var(--accent-color);
            color: white;
            padding: 8px 16px;
            text-decoration: none;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        
        .insight-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 20px 0;
            page-break-inside: avoid;
        }
        
        .insight-card {
            background: white;
            border-left: 3px solid var(--accent-color);
            padding: 15px;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
        }
        
        .insight-title {
            font-weight: 700;
            color: var(--dark-color);
            margin-bottom: 8px;
            font-size: 0.95em;
        }
        
        .chart-container {
            background: white;
            border-radius: var(--border-radius);
            padding: 20px;
            margin: 20px 0;
            text-align: center;
            box-shadow: var(--shadow);
            border: 1px solid var(--border-color);
            page-break-inside: avoid;
        }
        
        .chart-container img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
        }
        
        .chart-title {
            font-size: 1.1em;
            font-weight: 600;
            margin-bottom: 15px;
            color: var(--dark-color);
        }
        
        .insights-list {
            list-style: none;
            padding: 0;
        }
        
        .insights-list li {
            background: white;
            margin: 8px 0;
            padding: 12px 15px;
            border-radius: var(--border-radius);
            border-left: 3px solid var(--accent-color);
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            font-size: 0.9em;
            page-break-inside: avoid;
        }
        
        .footer {
            margin-top: 40px;
            padding: 30px 0;
            background: var(--dark-color);
            color: white;
            text-align: center;
            border-top: 3px solid var(--accent-color);
            page-break-before: always;
        }
        
        .footer p {
            margin-bottom: 6px;
            opacity: 0.8;
            font-size: 0.85em;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        .page-break-inside-avoid {
            page-break-inside: avoid;
        }
        
        .chart-placeholder {
            background: #f8f9fa;
            border: 1px dashed #dee2e6;
            border-radius: var(--border-radius);
            padding: 30px;
            text-align: center;
            color: #6c757d;
            margin: 15px 0;
        }
        
        /* Ensure charts don't break across pages */
        .chart-container, .metric-card, .newspaper-card, .insight-card {
            page-break-inside: avoid;
        }
        
        /* Prevent sections from breaking awkwardly */
        .section {
            page-break-inside: avoid;
        }
        
        /* Allow page breaks only between major sections */
        .section + .section {
            page-break-before: auto;
        }
        
        /* Table styles for better data presentation */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 0.9em;
        }
        
        .data-table th,
        .data-table td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .data-table th {
            background: #f7fafc;
            font-weight: 600;
            color: var(--dark-color);
        }
        
        .data-table tr:hover {
            background: #f7fafc;
        }
        
        /* Print-specific optimizations */
        @media print {
            body {
                font-size: 11px;
            }
            
            .header {
                background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%) !important;
                -webkit-print-color-adjust: exact;
            }
            
            .key-insight {
                background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%) !important;
                -webkit-print-color-adjust: exact;
            }
            
            .section {
                margin-bottom: 25px;
            }
            
            .chart-container {
                box-shadow: none;
                border: 1px solid #e2e8f0;
            }
            
            .footer {
                margin-top: 30px;
            }
        }
    </style>
</head>
<body>
    <!-- Header Section -->
    <div class="header">
        <div class="header-content">
            <h1>News Comparison Analysis Report</h1>
            <div class="subtitle">Comprehensive Media Coverage Analysis</div>
            <div class="report-meta">
                <span>Generated on ${currentDate}</span>
                <span>•</span>
                <span>Analysis ID: ${comparison._id}</span>
            </div>
        </div>
    </div>

    <div class="container">
        <!-- Executive Summary -->
        <div class="section">
            <h2 class="section-title">📊 Executive Summary</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${articles.length}</div>
                    <div class="metric-label">Articles Analyzed</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${similarityAnalysis?.similarityScore || 0}%</div>
                    <div class="metric-label">Content Similarity</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.aiRemarks?.analysisMetrics?.qualityScore || 0}/100</div>
                    <div class="metric-label">Quality Score</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.aiRemarks?.analysisMetrics?.sentimentConsistency || 0}%</div>
                    <div class="metric-label">Sentiment Consistency</div>
                </div>
            </div>
            
            <div class="key-insight">
                <h3>🎯 Key Finding</h3>
                <p><strong>${similarityAnalysis?.isSameNews ? 'Same Story Coverage' : 'Different Story Angles'}</strong> - 
                ${similarityAnalysis?.isSameNews ? 
                  `All newspapers are covering the same story with ${similarityAnalysis.similarityScore}% content overlap.` :
                  `Newspapers are covering different aspects with only ${similarityAnalysis.similarityScore}% content similarity.`
                }</p>
            </div>
            
            <div class="analysis-section">
                <div class="analysis-title">Overall Assessment</div>
                <div class="analysis-content">
                    ${report.aiRemarks?.overallAssessment || 'Comprehensive analysis not available at this time.'}
                </div>
            </div>
        </div>

        <!-- Newspaper Coverage Analysis -->
        <div class="section page-break">
            <h2 class="section-title">📰 Newspaper Coverage Analysis</h2>
            <div class="newspaper-grid">
                ${comparison.articles.map((compArticle, index) => {
                  const article = articles[index]
                  return `
                    <div class="newspaper-card">
                        <div class="newspaper-header">
                            <h3 class="newspaper-name">${compArticle?.newspaperName || 'Unknown Source'}</h3>
                            <div class="sentiment-indicators">
                                <span class="sentiment-badge sentiment-${(compArticle?.headingSentiment || 'neutral').toLowerCase()}">
                                    H: ${compArticle?.headingSentiment || 'Neutral'}
                                </span>
                                <span class="sentiment-badge sentiment-${(compArticle?.contentSentiment || 'neutral').toLowerCase()}">
                                    C: ${compArticle?.contentSentiment || 'Neutral'}
                                </span>
                            </div>
                        </div>
                        <div class="article-headline">${article?.heading || 'Headline not available'}</div>
                        <div class="article-stats">
                            <div class="stat">
                                <span class="stat-label">Word Count</span>
                                <span class="stat-value">${article?.content?.split(' ').length || 0}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Language</span>
                                <span class="stat-value">${article?.language || 'English'}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Readability</span>
                                <span class="stat-value">${compArticle?.readabilityScore || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                  `
                }).join('')}
            </div>
        </div>

        <!-- Visual Analytics -->
        <div class="section page-break">
            <h2 class="section-title">📈 Visual Analytics</h2>
            
            <div class="insight-grid">
                <div class="insight-card">
                    <div class="insight-title">Quality Assessment</div>
                    <p>Analysis Quality Score: <strong>${report.aiRemarks?.analysisMetrics?.qualityScore || 0}/100</strong></p>
                    <p>Sentiment Consistency: <strong>${report.aiRemarks?.analysisMetrics?.sentimentConsistency || 0}%</strong></p>
                    <p>Factual Accuracy: <strong>${report.aiRemarks?.analysisMetrics?.factualAccuracy || 'N/A'}</strong></p>
                </div>
                
                <div class="insight-card">
                    <div class="insight-title">Similarity Analysis</div>
                    <p>Content Similarity: <strong>${similarityAnalysis?.similarityScore || 0}%</strong></p>
                    <p>Common Keywords: <strong>${similarityAnalysis?.commonKeywords?.length || 0}</strong></p>
                    <p>Coverage Type: <strong>${similarityAnalysis?.isSameNews ? 'Uniform' : 'Diverse'}</strong></p>
                </div>
            </div>
            
            ${chartBase64.sentimentChart ? `
            <div class="chart-container">
                <div class="chart-title">Sentiment Distribution Across Newspapers</div>
                <img src="${chartBase64.sentimentChart}" alt="Sentiment Distribution Chart" />
            </div>
            ` : ''}
            
            ${chartBase64.radarChart ? `
            <div class="chart-container">
                <div class="chart-title">Comprehensive Metrics Analysis</div>
                <img src="${chartBase64.radarChart}" alt="Similarity Metrics Chart" />
            </div>
            ` : ''}
            
            ${chartBase64.wordChart ? `
            <div class="chart-container">
                <div class="chart-title">Keyword Frequency Analysis</div>
                <img src="${chartBase64.wordChart}" alt="Word Frequency Chart" />
            </div>
            ` : ''}
        </div>

        <!-- Detailed Analysis -->
        ${report.aiRemarks?.detailedAnalysis ? `
        <div class="section page-break">
            <h2 class="section-title">🔍 Detailed Analysis</h2>
            
            ${report.aiRemarks.detailedAnalysis.detailedComparison ? `
            <div class="analysis-section">
                <div class="analysis-title">Content Similarities & Differences</div>
                <div class="analysis-content">
                    <h4 style="margin: 15px 0 10px 0; color: var(--primary-color);">Key Similarities:</h4>
                    <ul class="insights-list">
                        ${(report.aiRemarks.detailedAnalysis.detailedComparison.similarities || []).map(item => `<li>${item}</li>`).join('')}
                    </ul>
                    
                    <h4 style="margin: 20px 0 10px 0; color: var(--primary-color);">Notable Differences:</h4>
                    <ul class="insights-list">
                        ${(report.aiRemarks.detailedAnalysis.detailedComparison.differences || []).map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            </div>
            ` : ''}
        </div>
        ` : ''}

        <!-- Key Insights -->
        <div class="section ${!report.aiRemarks?.detailedAnalysis ? 'page-break' : ''}">
            <h2 class="section-title">💡 Key Insights & Findings</h2>
            <ul class="insights-list">
                ${(report.aiRemarks?.keyInsights || ['No specific insights available']).map(insight => `<li>${insight}</li>`).join('')}
            </ul>
        </div>

        <!-- Recommendations -->
        <div class="section">
            <h2 class="section-title">📋 Recommendations</h2>
            <ul class="insights-list">
                ${(report.aiRemarks?.recommendations || ['Continue monitoring coverage for emerging trends']).map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>SentiScan AI News Analysis Platform</strong></p>
            <p>Professional Media Intelligence & Analysis</p>
            <p>Report generated on ${currentDate} | Analysis ID: ${comparison._id}</p>
            <p style="margin-top: 10px; font-size: 0.8em; opacity: 0.7;">
                Confidential Analysis - For Authorized Use Only
            </p>
        </div>
    </div>
</body>
</html>
  `
}