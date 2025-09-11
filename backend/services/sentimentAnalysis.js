import { OpenAI } from 'openai'

class SentimentAnalysisService {
  constructor() {
    console.log('🚀 Starting SentimentAnalysisService...')
    
    // Initialize OpenAI client
    const initialized = this.initializeOpenAI()
    console.log(`🔌 OpenAI client initialization: ${initialized ? '✅ Success' : '❌ Failed'}`)
    
    // If initialization failed, try again after a short delay
    if (!initialized) {
      console.log('🔄 Will retry OpenAI initialization in 2 seconds...')
      setTimeout(() => {
        const retryResult = this.initializeOpenAI()
        console.log(`🔁 OpenAI retry initialization: ${retryResult ? '✅ Success' : '❌ Failed'}`)
      }, 2000)
    }
  }

  // Getter to expose OpenAI client for other services
  get openai() {
    return this._openai
  }

  initializeOpenAI() {
    // Check if Azure OpenAI is configured
    if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
      console.warn('⚠️ Azure OpenAI credentials not found. Sentiment analysis will be limited.')
      this._openai = null
      return false
    }

    try {
      console.log('🔄 Initializing Azure OpenAI with:')
      console.log(`- API Key: ${process.env.AZURE_OPENAI_API_KEY ? '✅ Present (hidden)' : '❌ Missing'}`)
      console.log(`- Endpoint: ${process.env.AZURE_OPENAI_ENDPOINT}`)
      console.log(`- Deployment: ${process.env.AZURE_OPENAI_DEPLOYMENT}`)
      console.log(`- API Version: ${process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'}`)
      
      // Validate required fields
      if (!process.env.AZURE_OPENAI_DEPLOYMENT) {
        console.error('❌ AZURE_OPENAI_DEPLOYMENT is missing in environment variables')
        return false
      }
      
      // Create direct configuration for Azure OpenAI
      const configuration = {
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
        defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview' },
        defaultHeaders: {
          'api-key': process.env.AZURE_OPENAI_API_KEY,
        },
      }
      
      console.log('📝 OpenAI Configuration:', {
        baseURL: configuration.baseURL,
        hasApiKey: !!configuration.apiKey,
        apiVersion: configuration.defaultQuery['api-version']
      })
      
      // Create the OpenAI client
      this._openai = new OpenAI(configuration)
      
      // Test the connection with a simple request
      console.log('🧪 Testing Azure OpenAI connection...')
      this._openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      }).then(() => {
        console.log('✅ Azure OpenAI connection test successful')
      }).catch((error) => {
        console.error('❌ Azure OpenAI connection test failed:', error.message)
      })
      
      console.log('✅ Azure OpenAI service initialized successfully')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Azure OpenAI:', error)
      console.error('❌ Error details:', error.message)
      this._openai = null
      return false
    }
  }

  async analyzeSentiment(heading, content) {
    // If OpenAI client is not initialized, try to initialize it again
    if (!this._openai && !this.initializeOpenAI()) {
      console.warn('⚠️ Azure OpenAI not configured, returning default sentiment')
      return {
        headingSentiment: 'Neutral',
        headingSentimentReason: 'Azure OpenAI not configured - using default classification',
        contentSentiment: 'Neutral',
        contentSentimentReason: 'Azure OpenAI not configured - using default classification',
        confidence: 'low',
        error: 'Azure OpenAI not configured'
      }
    }

    console.log('🧠 Starting sentiment analysis with Azure OpenAI...')

    try {
      const systemPrompt = {
        role: 'system',
        content: `You are a sentiment analysis assistant. Classify the given article heading and body into one of these categories: Positive, Negative, Neutral, or Mixed. 

The text may be in English, Hindi, or Gujarati. Respond in JSON format with the following structure:
{
  "headingSentiment": "Positive|Negative|Neutral|Mixed",
  "headingSentimentReason": "Brief explanation for heading classification",
  "contentSentiment": "Positive|Negative|Neutral|Mixed", 
  "contentSentimentReason": "Brief explanation for content classification",
  "confidence": "high|medium|low"
}

Guidelines for Classification:
- Positive: Expresses joy, satisfaction, hope, success, optimism, achievements, celebrations, good news
- Negative: Expresses sadness, anger, fear, disappointment, criticism, failures, disasters, bad news
- Neutral: Factual, informative, or balanced without strong emotion, objective reporting
- Mixed: Contains both positive and negative sentiments in significant portions

Guidelines for Reasoning:
- Keep explanations concise (1-2 sentences maximum)
- Mention specific words, phrases, or themes that influenced the classification
- For multilingual text, explain in English regardless of source language
- Focus on the most impactful emotional indicators
- For Mixed sentiment, explain what makes it both positive and negative
- For Neutral, explain why it lacks emotional bias

Examples of good reasoning:
- "Contains celebratory language like 'success', 'achievement', and 'breakthrough' indicating positive outcomes"
- "Uses words like 'crisis', 'failure', and 'devastating' creating a negative emotional tone"
- "Presents factual information about statistics and data without emotional language or bias"
- "Combines positive elements about economic growth with negative concerns about environmental impact"`
      }

      const userPrompt = {
        role: 'user',
        content: `Analyze the sentiment of this article:

HEADING: ${heading}

CONTENT: ${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}`
      }

      console.log('📤 Sending request to Azure OpenAI...')
      console.log('📝 Using model:', process.env.AZURE_OPENAI_DEPLOYMENT)
      
      const response = await this._openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT,
        messages: [systemPrompt, userPrompt],
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: "json_object" }
      })

      console.log('📥 Received response from Azure OpenAI')
      
      const result = response.choices[0]?.message?.content
      if (!result) {
        throw new Error('No response content from Azure OpenAI')
      }

      console.log('🔄 Raw response:', result)

      // Parse JSON response
      let sentimentData
      try {
        sentimentData = JSON.parse(result)
        console.log('✅ Parsed sentiment data:', sentimentData)
      } catch (parseError) {
        console.error('❌ Error parsing JSON response:', parseError)
        console.log('📄 Raw response that failed parsing:', result)
        throw new Error(`Failed to parse sentiment response: ${parseError.message}`)
      }
      
      return {
        headingSentiment: sentimentData.headingSentiment || 'Neutral',
        headingSentimentReason: sentimentData.headingSentimentReason || 'No specific reasoning provided',
        contentSentiment: sentimentData.contentSentiment || 'Neutral',
        contentSentimentReason: sentimentData.contentSentimentReason || 'No specific reasoning provided',
        confidence: sentimentData.confidence || 'medium',
      }
    } catch (error) {
      console.error('❌ Error analyzing sentiment:', error)
      console.error('❌ Error details:', error.message)
      
      // Fallback to neutral if API fails
      return {
        headingSentiment: 'Neutral',
        headingSentimentReason: 'Analysis failed - using default neutral classification',
        contentSentiment: 'Neutral',
        contentSentimentReason: 'Analysis failed - using default neutral classification',
        confidence: 'low',
        error: error.message,
      }
    }
  }

  async batchAnalyzeSentiment(articles) {
    // If OpenAI client is not initialized, try to initialize it again
    if (!this._openai) {
      const initialized = this.initializeOpenAI()
      if (!initialized) {
        console.warn('⚠️ Azure OpenAI not configured, batch sentiment analysis will return defaults')
        return articles.map(article => ({
          articleId: article._id,
          headingSentiment: 'Neutral',
          headingSentimentReason: 'Azure OpenAI not configured - using default classification',
          contentSentiment: 'Neutral',
          contentSentimentReason: 'Azure OpenAI not configured - using default classification',
          confidence: 'low',
          error: 'Azure OpenAI not configured'
        }))
      }
    }

    console.log(`🧠 Starting batch sentiment analysis for ${articles.length} articles...`)
    const results = []
    
    for (const article of articles) {
      try {
        console.log(`📄 Analyzing article ${article._id}...`)
        const sentiment = await this.analyzeSentiment(article.heading, article.content)
        results.push({
          articleId: article._id,
          ...sentiment,
        })
        console.log(`✅ Analysis complete for article ${article._id}:`, sentiment)
        
        // Add delay to avoid rate limiting
        const delayMs = 1000
        console.log(`⏱️ Adding delay of ${delayMs}ms before next article...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      } catch (error) {
        console.error(`❌ Error analyzing article ${article._id}:`, error)
        results.push({
          articleId: article._id,
          headingSentiment: 'Neutral',
          headingSentimentReason: 'Analysis failed - using default neutral classification',
          contentSentiment: 'Neutral',
          contentSentimentReason: 'Analysis failed - using default neutral classification',
          confidence: 'low',
          error: error.message,
        })
      }
    }
    
    console.log(`✅ Batch sentiment analysis completed for ${articles.length} articles`)
    return results
  }
}

export default new SentimentAnalysisService()
