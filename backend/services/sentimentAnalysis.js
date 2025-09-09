import { OpenAI } from 'openai'

class SentimentAnalysisService {
  constructor() {
    this.initializeOpenAI()
  }

  initializeOpenAI() {
    // Check if Azure OpenAI is configured
    if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
      console.warn('⚠️ Azure OpenAI credentials not found. Sentiment analysis will be limited.')
      this.openai = null
      return false
    }

    try {
      console.log('🔄 Initializing Azure OpenAI with:')
      console.log(`- API Key: ${process.env.AZURE_OPENAI_API_KEY ? '✅ Present (hidden)' : '❌ Missing'}`)
      console.log(`- Endpoint: ${process.env.AZURE_OPENAI_ENDPOINT}`)
      console.log(`- Deployment: ${process.env.AZURE_OPENAI_DEPLOYMENT}`)
      console.log(`- API Version: ${process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'}`)
      
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
      
      this.openai = new OpenAI(configuration)
      console.log('✅ Azure OpenAI service initialized successfully')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Azure OpenAI:', error)
      console.error('❌ Error details:', error.message)
      this.openai = null
      return false
    }
  }

  async analyzeSentiment(heading, content) {
    // If OpenAI client is not initialized, try to initialize it again
    if (!this.openai && !this.initializeOpenAI()) {
      console.warn('⚠️ Azure OpenAI not configured, returning default sentiment')
      return {
        headingSentiment: 'Neutral',
        contentSentiment: 'Neutral',
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
  "contentSentiment": "Positive|Negative|Neutral|Mixed",
  "confidence": "high|medium|low"
}

Guidelines:
- Positive: Expresses joy, satisfaction, hope, success, or optimism
- Negative: Expresses sadness, anger, fear, disappointment, or criticism  
- Neutral: Factual, informative, or balanced without strong emotion
- Mixed: Contains both positive and negative sentiments in significant portions`
      }

      const userPrompt = {
        role: 'user',
        content: `Analyze the sentiment of this article:

HEADING: ${heading}

CONTENT: ${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}`
      }

      console.log('📤 Sending request to Azure OpenAI...')
      console.log('📝 Using model:', process.env.AZURE_OPENAI_DEPLOYMENT)
      
      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT,
        messages: [systemPrompt, userPrompt],
        temperature: 0.1,
        max_tokens: 150,
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
        contentSentiment: sentimentData.contentSentiment || 'Neutral',
        confidence: sentimentData.confidence || 'medium',
      }
    } catch (error) {
      console.error('❌ Error analyzing sentiment:', error)
      console.error('❌ Error details:', error.message)
      
      // Fallback to neutral if API fails
      return {
        headingSentiment: 'Neutral',
        contentSentiment: 'Neutral',
        confidence: 'low',
        error: error.message,
      }
    }
  }

  async batchAnalyzeSentiment(articles) {
    // If OpenAI client is not initialized, try to initialize it again
    if (!this.openai) {
      const initialized = this.initializeOpenAI()
      if (!initialized) {
        console.warn('⚠️ Azure OpenAI not configured, batch sentiment analysis will return defaults')
        return articles.map(article => ({
          articleId: article._id,
          headingSentiment: 'Neutral',
          contentSentiment: 'Neutral',
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
          contentSentiment: 'Neutral',
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
