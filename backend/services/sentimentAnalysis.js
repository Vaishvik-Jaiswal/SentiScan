import { OpenAI } from 'openai'

class SentimentAnalysisService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
      defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION },
      defaultHeaders: {
        'api-key': process.env.AZURE_OPENAI_API_KEY,
      },
    })
  }

  async analyzeSentiment(heading, content) {
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

      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT,
        messages: [systemPrompt, userPrompt],
        temperature: 0.1,
        max_tokens: 150,
      })

      const result = response.choices[0]?.message?.content
      if (!result) {
        throw new Error('No response from OpenAI')
      }

      // Parse JSON response
      const sentimentData = JSON.parse(result)
      
      return {
        headingSentiment: sentimentData.headingSentiment || 'Neutral',
        contentSentiment: sentimentData.contentSentiment || 'Neutral',
        confidence: sentimentData.confidence || 'medium',
      }
    } catch (error) {
      console.error('Error analyzing sentiment:', error)
      
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
    const results = []
    
    for (const article of articles) {
      try {
        const sentiment = await this.analyzeSentiment(article.heading, article.content)
        results.push({
          articleId: article._id,
          ...sentiment,
        })
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Error analyzing article ${article._id}:`, error)
        results.push({
          articleId: article._id,
          headingSentiment: 'Neutral',
          contentSentiment: 'Neutral',
          confidence: 'low',
          error: error.message,
        })
      }
    }
    
    return results
  }
}

export default new SentimentAnalysisService()
