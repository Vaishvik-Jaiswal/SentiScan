import { OpenAI } from 'openai'

class SentimentAnalysisService {
  constructor() {
    console.log('🚀 Starting SentimentAnalysisService...')
    
    // Initialize sentiment word lists
    this.initializeSentimentLexicon()
    
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

  initializeSentimentLexicon() {
    // Enhanced multilingual sentiment lexicon
    this.sentimentWords = {
      positive: {
        english: [
          'excellent', 'amazing', 'wonderful', 'fantastic', 'great', 'good', 'best', 'awesome', 'outstanding',
          'brilliant', 'superb', 'magnificent', 'marvelous', 'perfect', 'beautiful', 'lovely', 'nice',
          'happy', 'joy', 'delighted', 'pleased', 'satisfied', 'thrilled', 'excited', 'cheerful',
          'success', 'achievement', 'victory', 'win', 'triumph', 'accomplish', 'breakthrough', 'progress',
          'improve', 'better', 'upgrade', 'enhance', 'boost', 'increase', 'rise', 'growth', 'gain',
          'celebrate', 'congratulate', 'praise', 'honor', 'reward', 'benefit', 'advantage', 'opportunity',
          'hope', 'optimistic', 'positive', 'confident', 'proud', 'grateful', 'blessed', 'fortunate',
          'love', 'like', 'enjoy', 'appreciate', 'admire', 'respect', 'support', 'approve', 'welcome'
        ],
        hindi: [
          'अच्छा', 'बेहतरीन', 'शानदार', 'उत्कृष्ट', 'महान', 'सुंदर', 'प्रभावशाली', 'अद्भुत',
          'खुशी', 'आनंद', 'हर्ष', 'प्रसन्न', 'संतुष्ट', 'उत्साहित', 'खुश', 'मस्त',
          'सफलता', 'उपलब्धि', 'जीत', 'विजय', 'कामयाबी', 'प्रगति', 'सुधार', 'वृद्धि',
          'लाभ', 'फायदा', 'मौका', 'अवसर', 'आशा', 'उम्मीद', 'विश्वास', 'गर्व',
          'प्रेम', 'प्यार', 'पसंद', 'सराहना', 'समर्थन', 'स्वागत', 'धन्यवाद', 'आभार'
        ],
        gujarati: [
          'સારું', 'ઉત્તમ', 'શાનદાર', 'અદ્ભુત', 'મહાન', 'સુંદર', 'પ્રભાવશાળી', 'અસાધારણ',
          'ખુશી', 'આનંદ', 'હર્ષ', 'પ્રસન્ન', 'સંતુષ્ટ', 'ઉત્સાહિત', 'ખુશ', 'મસ્ત',
          'સફળતા', 'સિદ્ધિ', 'જીત', 'વિજય', 'કામયાબી', 'પ્રગતિ', 'સુધારો', 'વૃદ્ધિ',
          'લાભ', 'ફાયદો', 'તક', 'અવસર', 'આશા', 'ઉમેદ', 'વિશ્વાસ', 'ગર્વ',
          'પ્રેમ', 'પ્યાર', 'પસંદ', 'પ્રશંસા', 'સમર્થન', 'સ્વાગત', 'આભાર', 'ધન્યવાદ'
        ]
      },
      negative: {
        english: [
          'terrible', 'awful', 'horrible', 'bad', 'worst', 'poor', 'disappointing', 'disgusting',
          'sad', 'angry', 'upset', 'frustrated', 'annoyed', 'worried', 'concerned', 'depressed',
          'failure', 'defeat', 'loss', 'disaster', 'crisis', 'problem', 'issue', 'trouble',
          'decline', 'decrease', 'fall', 'drop', 'reduce', 'worsen', 'deteriorate', 'damage',
          'hate', 'dislike', 'reject', 'oppose', 'criticize', 'blame', 'condemn', 'complain',
          'fear', 'scared', 'afraid', 'panic', 'terror', 'shock', 'surprise', 'concern',
          'violence', 'attack', 'crime', 'murder', 'death', 'accident', 'injury', 'harm',
          'corrupt', 'illegal', 'wrong', 'unfair', 'unjust', 'dishonest', 'fraud', 'scam'
        ],
        hindi: [
          'बुरा', 'खराब', 'गलत', 'भयानक', 'दुखद', 'निराशाजनक', 'घृणित', 'अप्रिय',
          'दुख', 'गुस्सा', 'क्रोध', 'परेशान', 'चिंतित', 'डरा', 'भयभीत', 'उदास',
          'असफलता', 'हार', 'नुकसान', 'आपदा', 'संकट', 'समस्या', 'मुसीबत', 'परेशानी',
          'गिरावट', 'कमी', 'घटना', 'नुकसान', 'बिगड़ना', 'खराब', 'हानि', 'क्षति',
          'नफरत', 'घृणा', 'विरोध', 'आलोचना', 'दोष', 'शिकायत', 'निंदा', 'भर्त्सना',
          'डर', 'भय', 'आतंक', 'चिंता', 'हिंसा', 'हमला', 'अपराध', 'मौत'
        ],
        gujarati: [
          'ખરાબ', 'બુરું', 'ગલત', 'ભયાનક', 'દુઃખદ', 'નિરાશાજનક', 'ઘૃણાસ્પદ', 'અપ્રિય',
          'દુઃખ', 'ગુસ્સો', 'ક્રોધ', 'પરેશાન', 'ચિંતિત', 'ડરેલા', 'ભયભીત', 'ઉદાસ',
          'અસફળતા', 'હાર', 'નુકસાન', 'આપત્તિ', 'સંકટ', 'સમસ્યા', 'મુશ્કેલી', 'પરેશાની',
          'ઘટાડો', 'કમી', 'ઘટના', 'નુકસાન', 'બગડવું', 'ખરાબ', 'હાનિ', 'ક્ષતિ',
          'નફરત', 'ઘૃણા', 'વિરોધ', 'ટીકા', 'દોષ', 'ફરિયાદ', 'નિંદા', 'ભર્ત્સના',
          'ડર', 'ભય', 'આતંક', 'ચિંતા', 'હિંસા', 'હુમલો', 'ગુનો', 'મૃત્યુ'
        ]
      }
    }

    // Sentiment modifiers and intensifiers
    this.intensifiers = {
      english: ['very', 'extremely', 'highly', 'really', 'absolutely', 'completely', 'totally', 'quite', 'rather', 'so', 'too'],
      hindi: ['बहुत', 'अत्यधिक', 'काफी', 'पूरी तरह', 'बिल्कुल', 'सच में', 'वास्तव में'],
      gujarati: ['ખૂબ', 'અત્યધિક', 'ખૂબજ', 'પૂરી રીતે', 'બિલકુલ', 'સાચે', 'વાસ્તવમાં']
    }

    // Negation words
    this.negations = {
      english: ['not', 'no', 'never', 'nothing', 'nobody', 'nowhere', 'neither', 'nor', 'none', 'without'],
      hindi: ['नहीं', 'न', 'कभी नहीं', 'कुछ नहीं', 'कोई नहीं', 'बिना', 'ना'],
      gujarati: ['નહીં', 'ન', 'કદી નહીં', 'કંઈ નહીં', 'કોઈ નહીં', 'વગર', 'ના']
    }

    console.log('📚 Sentiment lexicon initialized with enhanced multilingual support')
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

  // Local sentiment analysis using word-based approach
  analyzeLocalSentiment(text) {
    if (!text || typeof text !== 'string') {
      return { sentiment: 'Neutral', score: 0, confidence: 'low', reason: 'No text provided' }
    }

    const normalizedText = text.toLowerCase()
    let positiveScore = 0
    let negativeScore = 0
    let positiveWords = []
    let negativeWords = []
    let intensifierMultiplier = 1
    let negationActive = false

    // Split text into words and analyze
    const words = normalizedText.split(/\s+/)
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^\w\u0900-\u097F\u0A80-\u0AFF]/g, '') // Keep English, Hindi, Gujarati chars
      
      // Check for intensifiers
      const isIntensifier = Object.values(this.intensifiers).some(lang => 
        lang.some(intensifier => word.includes(intensifier.toLowerCase()))
      )
      if (isIntensifier) {
        intensifierMultiplier = 1.5
        continue
      }

      // Check for negations
      const isNegation = Object.values(this.negations).some(lang => 
        lang.some(negation => word.includes(negation.toLowerCase()))
      )
      if (isNegation) {
        negationActive = true
        continue
      }

      // Check for positive words
      const isPositive = Object.values(this.sentimentWords.positive).some(lang => 
        lang.some(posWord => word.includes(posWord.toLowerCase()) || posWord.toLowerCase().includes(word))
      )
      
      if (isPositive) {
        const score = intensifierMultiplier * (negationActive ? -1 : 1)
        if (negationActive) {
          negativeScore += Math.abs(score)
          negativeWords.push(word)
        } else {
          positiveScore += score
          positiveWords.push(word)
        }
        intensifierMultiplier = 1
        negationActive = false
        continue
      }

      // Check for negative words
      const isNegative = Object.values(this.sentimentWords.negative).some(lang => 
        lang.some(negWord => word.includes(negWord.toLowerCase()) || negWord.toLowerCase().includes(word))
      )
      
      if (isNegative) {
        const score = intensifierMultiplier * (negationActive ? -1 : 1)
        if (negationActive) {
          positiveScore += Math.abs(score)
          positiveWords.push(word)
        } else {
          negativeScore += score
          negativeWords.push(word)
        }
        intensifierMultiplier = 1
        negationActive = false
        continue
      }

      // Reset modifiers if no sentiment word found
      if (!isIntensifier && !isNegation) {
        intensifierMultiplier = 1
        negationActive = false
      }
    }

    // Calculate final sentiment
    const totalScore = positiveScore - negativeScore
    const totalWords = positiveWords.length + negativeWords.length
    
    let sentiment = 'Neutral'
    let confidence = 'low'
    let reason = 'No clear sentiment indicators found'

    // More aggressive thresholds for better detection
    if (totalScore > 0.5 || positiveWords.length >= 2) {
      sentiment = 'Positive'
      confidence = totalWords >= 3 ? 'high' : totalWords >= 2 ? 'medium' : 'low'
      reason = `Found positive indicators: ${positiveWords.slice(0, 3).join(', ')}${positiveWords.length > 3 ? '...' : ''}`
    } else if (totalScore < -0.5 || negativeWords.length >= 2) {
      sentiment = 'Negative'
      confidence = totalWords >= 3 ? 'high' : totalWords >= 2 ? 'medium' : 'low'
      reason = `Found negative indicators: ${negativeWords.slice(0, 3).join(', ')}${negativeWords.length > 3 ? '...' : ''}`
    } else if (totalWords > 0) {
      // If we found sentiment words but they're balanced
      if (positiveWords.length > 0 && negativeWords.length > 0) {
        reason = `Mixed sentiment detected: ${positiveWords.length} positive, ${negativeWords.length} negative words`
      } else if (totalWords === 1) {
        reason = `Single sentiment word found but below threshold`
      }
    }

    return {
      sentiment,
      score: totalScore,
      confidence,
      reason,
      details: {
        positiveScore,
        negativeScore,
        positiveWords: positiveWords.slice(0, 5),
        negativeWords: negativeWords.slice(0, 5),
        totalWords
      }
    }
  }

  async analyzeSentiment(heading, content) {
    console.log('🧠 Starting comprehensive sentiment analysis...')
    
    // Always try local analysis first for better accuracy
    const headingLocal = this.analyzeLocalSentiment(heading)
    const contentLocal = this.analyzeLocalSentiment(content)
    
    console.log('🔍 Local analysis results:')
    console.log('📰 Heading:', headingLocal)
    console.log('📄 Content:', contentLocal)

    // If OpenAI client is not initialized, use local analysis only
    if (!this._openai && !this.initializeOpenAI()) {
      console.warn('⚠️ Azure OpenAI not configured, using local sentiment analysis')
      return {
        headingSentiment: headingLocal.sentiment,
        headingSentimentReason: headingLocal.reason,
        contentSentiment: contentLocal.sentiment,
        contentSentimentReason: contentLocal.reason,
        confidence: headingLocal.confidence === 'high' || contentLocal.confidence === 'high' ? 'high' : 
                   headingLocal.confidence === 'medium' || contentLocal.confidence === 'medium' ? 'medium' : 'low',
        method: 'local_analysis'
      }
    }

    // Try Azure OpenAI analysis with enhanced prompting
    console.log('🧠 Starting Azure OpenAI sentiment analysis...')

    try {
      const systemPrompt = {
        role: 'system',
        content: `You are an expert sentiment analysis assistant. Classify the given article heading and body into one of these categories: Positive, Negative, or Neutral. 

The text may be in English, Hindi, or Gujarati. Be more sensitive to emotional indicators and avoid over-classifying as Neutral.

Respond in JSON format with the following structure:
{
  "headingSentiment": "Positive|Negative|Neutral",
  "headingSentimentReason": "Brief explanation for heading classification",
  "contentSentiment": "Positive|Negative|Neutral", 
  "contentSentimentReason": "Brief explanation for content classification",
  "confidence": "high|medium|low"
}

ENHANCED Guidelines for Classification:
- Positive: Success stories, achievements, celebrations, good news, improvements, benefits, hope, joy, satisfaction, praise, wins, breakthroughs, progress, growth
- Negative: Failures, disasters, crimes, accidents, deaths, conflicts, criticism, problems, decline, losses, fears, anger, disappointment, corruption, violence
- Neutral: ONLY use for purely factual reporting with NO emotional indicators, statistics without context, or perfectly balanced coverage

IMPORTANT: If you detect ANY emotional language, sentiment words, or subjective tone, classify as Positive or Negative rather than Neutral. Only use Neutral for completely objective, factual content.

Local Analysis Context (use this to inform your decision):
- Heading local analysis: ${headingLocal.sentiment} (${headingLocal.reason})
- Content local analysis: ${contentLocal.sentiment} (${contentLocal.reason})`
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
        max_tokens: 400,
        response_format: { type: "json_object" }
      })

      console.log('📥 Received response from Azure OpenAI')
      
      const result = response.choices[0]?.message?.content
      if (!result) {
        throw new Error('No response content from Azure OpenAI')
      }

      console.log('🔄 Raw Azure OpenAI response:', result)

      // Parse JSON response
      let aiSentimentData
      try {
        aiSentimentData = JSON.parse(result)
        console.log('✅ Parsed AI sentiment data:', aiSentimentData)
      } catch (parseError) {
        console.error('❌ Error parsing JSON response:', parseError)
        console.log('📄 Raw response that failed parsing:', result)
        throw new Error(`Failed to parse sentiment response: ${parseError.message}`)
      }

      // Combine AI and local analysis for final decision
      const finalHeadingSentiment = this.combineSentimentAnalysis(
        headingLocal, 
        {
          sentiment: aiSentimentData.headingSentiment || 'Neutral',
          reason: aiSentimentData.headingSentimentReason || 'No reasoning provided'
        }
      )

      const finalContentSentiment = this.combineSentimentAnalysis(
        contentLocal,
        {
          sentiment: aiSentimentData.contentSentiment || 'Neutral',
          reason: aiSentimentData.contentSentimentReason || 'No reasoning provided'
        }
      )
      
      return {
        headingSentiment: finalHeadingSentiment.sentiment,
        headingSentimentReason: finalHeadingSentiment.reason,
        contentSentiment: finalContentSentiment.sentiment,
        contentSentimentReason: finalContentSentiment.reason,
        confidence: aiSentimentData.confidence || 'medium',
        method: 'combined_analysis'
      }
    } catch (error) {
      console.error('❌ Error analyzing sentiment with Azure OpenAI:', error)
      console.error('❌ Error details:', error.message)
      
      // Fallback to local analysis if API fails
      console.log('🔄 Falling back to local sentiment analysis')
      return {
        headingSentiment: headingLocal.sentiment,
        headingSentimentReason: `${headingLocal.reason} (AI analysis failed: ${error.message})`,
        contentSentiment: contentLocal.sentiment,
        contentSentimentReason: `${contentLocal.reason} (AI analysis failed: ${error.message})`,
        confidence: headingLocal.confidence === 'high' || contentLocal.confidence === 'high' ? 'medium' : 'low',
        error: error.message,
        method: 'local_fallback'
      }
    }
  }

  // Combine local and AI sentiment analysis for better accuracy
  combineSentimentAnalysis(localResult, aiResult) {
    // If both agree, use that result
    if (localResult.sentiment === aiResult.sentiment) {
      return {
        sentiment: localResult.sentiment,
        reason: `Both local and AI analysis agree: ${aiResult.reason}`
      }
    }

    // If local found strong sentiment but AI says neutral, trust local
    if (aiResult.sentiment === 'Neutral' && localResult.sentiment !== 'Neutral' && localResult.confidence !== 'low') {
      return {
        sentiment: localResult.sentiment,
        reason: `Local analysis detected ${localResult.sentiment.toLowerCase()} sentiment (${localResult.reason}), overriding AI neutral classification`
      }
    }

    // If AI found sentiment but local says neutral, trust AI
    if (localResult.sentiment === 'Neutral' && aiResult.sentiment !== 'Neutral') {
      return {
        sentiment: aiResult.sentiment,
        reason: `AI analysis: ${aiResult.reason}`
      }
    }

    // If they disagree on positive vs negative, use AI but note the disagreement
    if ((localResult.sentiment === 'Positive' && aiResult.sentiment === 'Negative') ||
        (localResult.sentiment === 'Negative' && aiResult.sentiment === 'Positive')) {
      return {
        sentiment: aiResult.sentiment,
        reason: `AI analysis: ${aiResult.reason} (Note: Local analysis suggested ${localResult.sentiment.toLowerCase()})`
      }
    }

    // Default to AI result
    return {
      sentiment: aiResult.sentiment,
      reason: aiResult.reason
    }
  }

  async batchAnalyzeSentiment(articles) {
    // If OpenAI client is not initialized, try to initialize it again
    if (!this._openai) {
      const initialized = this.initializeOpenAI()
      if (!initialized) {
        console.warn('⚠️ Azure OpenAI not configured, using local sentiment analysis for batch processing')
        return articles.map(article => {
          const headingLocal = this.analyzeLocalSentiment(article.heading)
          const contentLocal = this.analyzeLocalSentiment(article.content)
          
          return {
            articleId: article._id,
            headingSentiment: headingLocal.sentiment,
            headingSentimentReason: headingLocal.reason,
            contentSentiment: contentLocal.sentiment,
            contentSentimentReason: contentLocal.reason,
            confidence: headingLocal.confidence === 'high' || contentLocal.confidence === 'high' ? 'high' : 
                       headingLocal.confidence === 'medium' || contentLocal.confidence === 'medium' ? 'medium' : 'low',
            method: 'local_batch_analysis'
          }
        })
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
