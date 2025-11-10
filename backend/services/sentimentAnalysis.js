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
    // Comprehensive multilingual sentiment lexicon with news-specific terms
    this.sentimentWords = {
      positive: {
        english: [
          // Basic positive words
          'excellent', 'amazing', 'wonderful', 'fantastic', 'great', 'good', 'best', 'awesome', 'outstanding',
          'brilliant', 'superb', 'magnificent', 'marvelous', 'perfect', 'beautiful', 'lovely', 'nice', 'fine',
          // Emotions
          'happy', 'joy', 'joyful', 'delighted', 'pleased', 'satisfied', 'thrilled', 'excited', 'cheerful', 'elated',
          'glad', 'content', 'blissful', 'euphoric', 'ecstatic', 'overjoyed', 'jubilant',
          // Success and achievement
          'success', 'successful', 'achievement', 'achieve', 'victory', 'victorious', 'win', 'winner', 'winning',
          'triumph', 'triumphant', 'accomplish', 'accomplished', 'breakthrough', 'progress', 'progressive',
          'advance', 'advancement', 'milestone', 'record', 'champion', 'championship', 'medal', 'award',
          // Improvement
          'improve', 'improved', 'improvement', 'better', 'upgrade', 'enhanced', 'enhance', 'boost', 'boosted',
          'increase', 'increased', 'rise', 'rising', 'growth', 'growing', 'gain', 'gained', 'flourish', 'prosper',
          'thrive', 'excel', 'soar', 'surge', 'peak', 'recover', 'recovery', 'revive', 'revival',
          // Celebration and recognition
          'celebrate', 'celebration', 'congratulate', 'congratulations', 'praise', 'praised', 'honor', 'honored',
          'reward', 'rewarded', 'recognition', 'recognize', 'applaud', 'commend', 'acclaim', 'salute',
          // Opportunity and benefit
          'benefit', 'beneficial', 'advantage', 'advantageous', 'opportunity', 'promising', 'potential',
          'favorable', 'positive', 'optimistic', 'hopeful', 'hope', 'confident', 'confidence', 'proud', 'pride',
          'grateful', 'gratitude', 'blessed', 'blessing', 'fortunate', 'lucky', 'gift', 'treasure',
          // Relationships and support
          'love', 'loving', 'like', 'enjoy', 'enjoyable', 'appreciate', 'appreciation', 'admire', 'admiration',
          'respect', 'respectful', 'support', 'supportive', 'approve', 'approval', 'welcome', 'welcoming',
          'friendly', 'kind', 'kindness', 'generous', 'helpful', 'caring', 'compassionate',
          // News-specific positive terms
          'launch', 'launched', 'inaugurate', 'inaugurated', 'open', 'opened', 'unveil', 'unveiled',
          'announce', 'announced', 'breakthrough', 'innovation', 'innovative', 'revolutionary', 'historic',
          'milestone', 'landmark', 'expansion', 'expand', 'development', 'developed', 'investment',
          'profit', 'profitable', 'revenue', 'earnings', 'dividend', 'bonus', 'raise', 'promotion'
        ],
        hindi: [
          // Basic positive
          'अच्छा', 'बेहतरीन', 'शानदार', 'उत्कृष्ट', 'महान', 'सुंदर', 'प्रभावशाली', 'अद्भुत', 'बढ़िया', 'उम्दा',
          // Emotions
          'खुशी', 'आनंद', 'हर्ष', 'प्रसन्न', 'संतुष्ट', 'उत्साहित', 'खुश', 'मस्त', 'प्रफुल्लित', 'हर्षित',
          // Success
          'सफलता', 'सफल', 'उपलब्धि', 'जीत', 'विजय', 'कामयाबी', 'प्रगति', 'सुधार', 'वृद्धि', 'विकास',
          'उन्नति', 'बढ़ोतरी', 'तरक्की', 'फायदा', 'लाभ', 'मुनाफा', 'फायदेमंद',
          // Opportunity
          'मौका', 'अवसर', 'आशा', 'उम्मीद', 'विश्वास', 'भरोसा', 'गर्व', 'सम्मान', 'इज्जत',
          // Relationships
          'प्रेम', 'प्यार', 'पसंद', 'सराहना', 'समर्थन', 'स्वागत', 'धन्यवाद', 'आभार', 'कृतज्ञता',
          // News terms
          'शुरुआत', 'आरंभ', 'उद्घाटन', 'लॉन्च', 'घोषणा', 'नवाचार', 'क्रांतिकारी', 'ऐतिहासिक', 'निवेश'
        ],
        gujarati: [
          // Basic positive
          'સારું', 'ઉત્તમ', 'શાનદાર', 'અદ્ભુત', 'મહાન', 'સુંદર', 'પ્રભાવશાળી', 'અસાધારણ', 'બેહતરીન',
          // Emotions
          'ખુશી', 'આનંદ', 'હર્ષ', 'પ્રસન્ન', 'સંતુષ્ટ', 'ઉત્સાહિત', 'ખુશ', 'મસ્ત', 'આહ્લાદિત',
          // Success
          'સફળતા', 'સફળ', 'સિદ્ધિ', 'જીત', 'વિજય', 'કામયાબી', 'પ્રગતિ', 'સુધારો', 'વૃદ્ધિ', 'વિકાસ',
          'ઉન્નતિ', 'વધારો', 'તરક્કી', 'ફાયદો', 'લાભ', 'મુનાફો', 'ફાયદાકારક',
          // Opportunity
          'તક', 'અવસર', 'આશા', 'ઉમેદ', 'વિશ્વાસ', 'ભરોસો', 'ગર્વ', 'સન્માન', 'ઇજ્જત',
          // Relationships
          'પ્રેમ', 'પ્યાર', 'પસંદ', 'પ્રશંસા', 'સમર્થન', 'સ્વાગત', 'આભાર', 'ધન્યવાદ', 'કૃતજ્ઞતા',
          // News terms
          'શરૂઆત', 'આરંભ', 'ઉદ્ઘાટન', 'લોન્ચ', 'જાહેરાત', 'નવાચાર', 'ક્રાંતિકારી', 'ઐતિહાસિક', 'રોકાણ'
        ]
      },
      negative: {
        english: [
          // Basic negative
          'terrible', 'awful', 'horrible', 'bad', 'worst', 'poor', 'disappointing', 'disgusting', 'dreadful',
          'appalling', 'shocking', 'outrageous', 'unacceptable', 'intolerable', 'unbearable', 'devastating',
          // Emotions
          'sad', 'sadness', 'angry', 'anger', 'upset', 'frustrated', 'frustration', 'annoyed', 'irritated',
          'worried', 'worry', 'concerned', 'concern', 'depressed', 'depression', 'miserable', 'gloomy',
          'distressed', 'anguished', 'heartbroken', 'devastated', 'traumatized', 'horrified', 'terrified',
          // Failure and problems
          'failure', 'failed', 'fail', 'defeat', 'defeated', 'loss', 'lost', 'lose', 'disaster', 'disastrous',
          'crisis', 'problem', 'problematic', 'issue', 'trouble', 'troubled', 'difficulty', 'struggle',
          'setback', 'obstacle', 'barrier', 'challenge', 'threat', 'risk', 'danger', 'dangerous',
          // Decline and damage
          'decline', 'declined', 'decrease', 'decreased', 'fall', 'fell', 'fallen', 'drop', 'dropped',
          'reduce', 'reduced', 'worsen', 'worsened', 'deteriorate', 'deteriorated', 'damage', 'damaged',
          'destroy', 'destroyed', 'ruin', 'ruined', 'collapse', 'collapsed', 'crash', 'crashed',
          // Negative actions
          'hate', 'hatred', 'dislike', 'reject', 'rejected', 'oppose', 'opposed', 'criticize', 'criticized',
          'blame', 'blamed', 'condemn', 'condemned', 'complain', 'complained', 'protest', 'protested',
          'attack', 'attacked', 'assault', 'assaulted', 'abuse', 'abused', 'betray', 'betrayed',
          // Fear and anxiety
          'fear', 'feared', 'scared', 'afraid', 'panic', 'panicked', 'terror', 'terrorized', 'shock', 'shocked',
          'surprise', 'surprised', 'alarm', 'alarmed', 'anxious', 'anxiety', 'nervous', 'tense',
          // Crime and violence
          'violence', 'violent', 'crime', 'criminal', 'murder', 'murdered', 'kill', 'killed', 'death', 'died',
          'accident', 'accidental', 'injury', 'injured', 'harm', 'harmed', 'hurt', 'wounded',
          // Corruption and dishonesty
          'corrupt', 'corruption', 'illegal', 'illegally', 'wrong', 'wrongly', 'unfair', 'unfairly',
          'unjust', 'unjustly', 'dishonest', 'dishonesty', 'fraud', 'fraudulent', 'scam', 'scammed',
          'cheat', 'cheated', 'steal', 'stolen', 'theft', 'robbery', 'bribe', 'bribery',
          // News-specific negative terms
          'layoff', 'layoffs', 'fired', 'dismissed', 'bankruptcy', 'bankrupt', 'recession', 'inflation',
          'unemployment', 'deficit', 'debt', 'scandal', 'controversy', 'investigation', 'arrest', 'arrested'
        ],
        hindi: [
          // Basic negative
          'बुरा', 'खराब', 'गलत', 'भयानक', 'दुखद', 'निराशाजनक', 'घृणित', 'अप्रिय', 'भयावह', 'डरावना',
          // Emotions
          'दुख', 'दुखी', 'गुस्सा', 'क्रोध', 'परेशान', 'परेशानी', 'चिंतित', 'चिंता', 'डरा', 'भयभीत', 'उदास',
          'निराश', 'हताश', 'दुखी', 'व्याकुल', 'बेचैन', 'तनावग्रस्त', 'पीड़ित',
          // Failure
          'असफलता', 'असफल', 'हार', 'हारना', 'नुकसान', 'हानि', 'आपदा', 'संकट', 'समस्या', 'मुसीबत',
          'कठिनाई', 'बाधा', 'रुकावट', 'खतरा', 'जोखिम', 'संघर्ष',
          // Decline
          'गिरावट', 'कमी', 'घटना', 'गिरना', 'बिगड़ना', 'खराब', 'क्षति', 'नष्ट', 'बर्बाद', 'तबाह',
          // Negative actions
          'नफरत', 'घृणा', 'विरोध', 'आलोचना', 'दोष', 'शिकायत', 'निंदा', 'भर्त्सना', 'हमला', 'आक्रमण',
          // Fear
          'डर', 'भय', 'आतंक', 'घबराहट', 'बेचैनी', 'तनाव',
          // Crime
          'हिंसा', 'अपराध', 'अपराधी', 'हत्या', 'मौत', 'मृत्यु', 'दुर्घटना', 'चोट', 'घायल',
          // Corruption
          'भ्रष्टाचार', 'भ्रष्ट', 'गैरकानूनी', 'अन्याय', 'अनुचित', 'बेईमानी', 'धोखाधड़ी', 'चोरी', 'रिश्वत',
          // News terms
          'छंटनी', 'बर्खास्तगी', 'दिवालिया', 'मंदी', 'महंगाई', 'बेरोजगारी', 'घाटा', 'कर्ज', 'घोटाला', 'गिरफ्तारी'
        ],
        gujarati: [
          // Basic negative
          'ખરાબ', 'બુરું', 'ગલત', 'ભયાનક', 'દુઃખદ', 'નિરાશાજનક', 'ઘૃણાસ્પદ', 'અપ્રિય', 'ભયાવહ', 'ડરામણું',
          // Emotions
          'દુઃખ', 'દુઃખી', 'ગુસ્સો', 'ક્રોધ', 'પરેશાન', 'પરેશાની', 'ચિંતિત', 'ચિંતા', 'ડરેલા', 'ભયભીત', 'ઉદાસ',
          'નિરાશ', 'હતાશ', 'દુઃખી', 'વ્યાકુળ', 'બેચેન', 'તણાવગ્રસ્ત', 'પીડિત',
          // Failure
          'અસફળતા', 'અસફળ', 'હાર', 'હારવું', 'નુકસાન', 'હાનિ', 'આપત્તિ', 'સંકટ', 'સમસ્યા', 'મુશ્કેલી',
          'કઠિનાઈ', 'બાધા', 'રુકાવટ', 'ખતરો', 'જોખમ', 'સંઘર્ષ',
          // Decline
          'ઘટાડો', 'કમી', 'ઘટના', 'ગિરવું', 'બગડવું', 'ખરાબ', 'ક્ષતિ', 'નષ્ટ', 'બરબાદ', 'તબાહ',
          // Negative actions
          'નફરત', 'ઘૃણા', 'વિરોધ', 'ટીકા', 'દોષ', 'ફરિયાદ', 'નિંદા', 'ભર્ત્સના', 'હુમલો', 'આક્રમણ',
          // Fear
          'ડર', 'ભય', 'આતંક', 'ઘબરાટ', 'બેચેની', 'તણાવ',
          // Crime
          'હિંસા', 'ગુનો', 'ગુનેગાર', 'હત્યા', 'મૃત્યુ', 'મોત', 'અકસ્માત', 'ઈજા', 'ઘાયલ',
          // Corruption
          'ભ્રષ્ટાચાર', 'ભ્રષ્ટ', 'ગેરકાયદેસર', 'અન્યાય', 'અયોગ્ય', 'બેઈમાની', 'છેતરપિંડી', 'ચોરી', 'લાંચ',
          // News terms
          'છટણી', 'બરતરફી', 'દિવાળિયું', 'મંદી', 'મોંઘવારી', 'બેરોજગારી', 'ખોટ', 'દેવું', 'ઘોટાળો', 'ધરપકડ'
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

  // Enhanced local sentiment analysis with better classification
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
    let negationWindow = 0 // Track negation scope

    // Split text into words and analyze
    const words = normalizedText.split(/\s+/)
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^\w\u0900-\u097F\u0A80-\u0AFF]/g, '') // Keep English, Hindi, Gujarati chars
      
      // Decrease negation window
      if (negationWindow > 0) {
        negationWindow--
        if (negationWindow === 0) {
          negationActive = false
        }
      }
      
      // Check for intensifiers
      const isIntensifier = Object.values(this.intensifiers).some(lang => 
        lang.some(intensifier => word.includes(intensifier.toLowerCase()) || intensifier.toLowerCase().includes(word))
      )
      if (isIntensifier) {
        intensifierMultiplier = 2.0 // Increased multiplier
        continue
      }

      // Check for negations
      const isNegation = Object.values(this.negations).some(lang => 
        lang.some(negation => word.includes(negation.toLowerCase()) || negation.toLowerCase().includes(word))
      )
      if (isNegation) {
        negationActive = true
        negationWindow = 3 // Negation affects next 3 words
        continue
      }

      // Check for positive words with partial matching
      const isPositive = Object.values(this.sentimentWords.positive).some(lang => 
        lang.some(posWord => {
          const pos = posWord.toLowerCase()
          return word.includes(pos) || pos.includes(word) || 
                 this.calculateSimilarity(word, pos) > 0.8
        })
      )
      
      if (isPositive) {
        const baseScore = 1.0
        const score = baseScore * intensifierMultiplier * (negationActive ? -1 : 1)
        if (negationActive) {
          negativeScore += Math.abs(score)
          negativeWords.push(word)
        } else {
          positiveScore += score
          positiveWords.push(word)
        }
        intensifierMultiplier = 1
        continue
      }

      // Check for negative words with partial matching
      const isNegative = Object.values(this.sentimentWords.negative).some(lang => 
        lang.some(negWord => {
          const neg = negWord.toLowerCase()
          return word.includes(neg) || neg.includes(word) || 
                 this.calculateSimilarity(word, neg) > 0.8
        })
      )
      
      if (isNegative) {
        const baseScore = 1.0
        const score = baseScore * intensifierMultiplier * (negationActive ? -1 : 1)
        if (negationActive) {
          positiveScore += Math.abs(score)
          positiveWords.push(word)
        } else {
          negativeScore += score
          negativeWords.push(word)
        }
        intensifierMultiplier = 1
        continue
      }

      // Reset intensifier if no sentiment word found
      if (!isIntensifier && !isNegation) {
        intensifierMultiplier = 1
      }
    }

    // Calculate final sentiment with enhanced logic
    const totalScore = positiveScore - negativeScore
    const totalWords = positiveWords.length + negativeWords.length
    const textLength = words.length
    
    let sentiment = 'Neutral'
    let confidence = 'low'
    let reason = 'No clear sentiment indicators found'

    // Balanced thresholds that prevent misclassification
    const sentimentDensity = totalWords / Math.max(textLength, 1)
    const minThreshold = 0.5 // Minimum score difference needed for classification
    const strongThreshold = 1.5 // Threshold for high confidence classification
    
    console.log(`📊 Sentiment Analysis Debug:`, {
      text: text.substring(0, 100) + '...',
      positiveScore,
      negativeScore,
      totalScore,
      positiveWords: positiveWords.length,
      negativeWords: negativeWords.length,
      sentimentDensity
    })

    // CRITICAL: Prevent positive/negative misclassification
    // Only classify if there's a clear dominant sentiment
    if (positiveWords.length > 0 && negativeWords.length > 0) {
      // Mixed sentiment - be very careful
      const scoreDifference = Math.abs(positiveScore - negativeScore)
      const wordDifference = Math.abs(positiveWords.length - negativeWords.length)
      
      if (scoreDifference >= strongThreshold && wordDifference >= 2) {
        // Strong difference - safe to classify
        if (positiveScore > negativeScore) {
          sentiment = 'Positive'
          confidence = 'medium'
          reason = `Predominantly positive: ${positiveWords.length} positive vs ${negativeWords.length} negative words, clear score advantage (${totalScore.toFixed(2)})`
        } else {
          sentiment = 'Negative'
          confidence = 'medium'
          reason = `Predominantly negative: ${negativeWords.length} negative vs ${positiveWords.length} positive words, clear score advantage (${totalScore.toFixed(2)})`
        }
      } else {
        // Too close to call - stay neutral to avoid misclassification
        sentiment = 'Neutral'
        confidence = 'medium'
        reason = `Mixed sentiment with close scores: ${positiveWords.length} positive, ${negativeWords.length} negative words - avoiding misclassification`
      }
    } else if (positiveWords.length > 0 && negativeWords.length === 0) {
      // Only positive words found - safe to classify as positive
      if (positiveScore >= strongThreshold || positiveWords.length >= 2) {
        sentiment = 'Positive'
        confidence = this.calculateConfidence(positiveWords.length, totalWords, positiveScore)
        reason = `Clear positive sentiment: ${positiveWords.slice(0, 3).join(', ')}${positiveWords.length > 3 ? ` (+${positiveWords.length - 3} more)` : ''} (score: ${positiveScore.toFixed(2)})`
      } else if (positiveWords.length === 1 && positiveScore >= minThreshold) {
        sentiment = 'Positive'
        confidence = 'low'
        reason = `Single positive indicator: ${positiveWords[0]} (score: ${positiveScore.toFixed(2)})`
      } else {
        sentiment = 'Neutral'
        confidence = 'low'
        reason = `Weak positive signals below threshold - staying neutral to ensure accuracy`
      }
    } else if (negativeWords.length > 0 && positiveWords.length === 0) {
      // Only negative words found - safe to classify as negative
      if (negativeScore >= strongThreshold || negativeWords.length >= 2) {
        sentiment = 'Negative'
        confidence = this.calculateConfidence(negativeWords.length, totalWords, negativeScore)
        reason = `Clear negative sentiment: ${negativeWords.slice(0, 3).join(', ')}${negativeWords.length > 3 ? ` (+${negativeWords.length - 3} more)` : ''} (score: ${negativeScore.toFixed(2)})`
      } else if (negativeWords.length === 1 && negativeScore >= minThreshold) {
        sentiment = 'Negative'
        confidence = 'low'
        reason = `Single negative indicator: ${negativeWords[0]} (score: ${negativeScore.toFixed(2)})`
      } else {
        sentiment = 'Neutral'
        confidence = 'low'
        reason = `Weak negative signals below threshold - staying neutral to ensure accuracy`
      }
    } else {
      // No sentiment words found
      sentiment = 'Neutral'
      confidence = 'high'
      reason = 'No sentiment indicators found - genuinely neutral content'
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
        totalWords,
        sentimentDensity
      }
    }
  }

  // Calculate string similarity for better word matching
  calculateSimilarity(str1, str2) {
    if (str1.length < 3 || str2.length < 3) return 0
    
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  // Calculate Levenshtein distance
  levenshteinDistance(str1, str2) {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  // Calculate confidence based on sentiment strength
  calculateConfidence(sentimentWords, totalWords, score) {
    if (sentimentWords >= 3 && score >= 2.0) return 'high'
    if (sentimentWords >= 2 && score >= 1.0) return 'medium'
    if (sentimentWords >= 1) return 'low'
    return 'low'
  }

  async analyzeSentiment(heading, content) {
    console.log('🧠 Starting AI-first sentiment analysis...')

    // If OpenAI client is not initialized, use local analysis as fallback
    if (!this._openai && !this.initializeOpenAI()) {
      console.warn('⚠️ Azure OpenAI not configured, falling back to local sentiment analysis')
      const headingLocal = this.analyzeLocalSentiment(heading)
      const contentLocal = this.analyzeLocalSentiment(content)
      
      return {
        headingSentiment: headingLocal.sentiment,
        headingSentimentReason: headingLocal.reason,
        contentSentiment: contentLocal.sentiment,
        contentSentimentReason: contentLocal.reason,
        confidence: headingLocal.confidence === 'high' || contentLocal.confidence === 'high' ? 'high' : 
                   headingLocal.confidence === 'medium' || contentLocal.confidence === 'medium' ? 'medium' : 'low',
        method: 'local_fallback'
      }
    }

    // Primary: Azure OpenAI analysis
    console.log('🤖 Using Azure OpenAI for sentiment analysis...')

    try {
      const systemPrompt = {
        role: 'system',
        content: `You are an expert sentiment analysis assistant specializing in news content. Your primary goal is ACCURACY - never misclassify positive content as negative or vice versa.

CRITICAL PRIORITY: Preventing misclassification is more important than avoiding neutral classifications.

Respond in JSON format:
{
  "headingSentiment": "Positive|Negative|Neutral",
  "headingSentimentReason": "Specific explanation with key words/phrases that influenced the decision",
  "contentSentiment": "Positive|Negative|Neutral", 
  "contentSentimentReason": "Detailed explanation with specific evidence from the text",
  "confidence": "high|medium|low"
}

CLASSIFICATION GUIDELINES:

POSITIVE indicators (classify as positive only if clearly positive):
- Success, achievement, victory, win, breakthrough, progress, growth, improvement
- Launch, opening, inauguration, celebration, milestone, record, award
- Benefits, opportunities, advantages, gains, profits, recovery
- Hope, optimism, confidence, satisfaction, joy, pride
- Support, approval, praise, recognition, honor
- Innovation, development, expansion, investment
- Clear good news or positive outcomes

NEGATIVE indicators (classify as negative only if clearly negative):
- Failure, loss, defeat, decline, crisis, disaster, accident
- Crime, violence, death, injury, harm, damage, destruction
- Problems, issues, troubles, difficulties, serious challenges, threats
- Criticism, blame, condemnation, protest, strong opposition
- Fear, worry, serious concern, anxiety, anger, frustration
- Corruption, fraud, scandal, controversy, investigation
- Layoffs, bankruptcy, recession, unemployment, deficit
- Clear bad news or negative outcomes

NEUTRAL (use when appropriate):
- Pure factual reporting without emotional language
- Balanced coverage with both positive and negative aspects
- Procedural announcements or routine updates
- Statistical data without clear positive/negative implications
- Mixed sentiment where positive and negative elements are roughly equal
- When you're uncertain about the sentiment direction

ACCURACY RULES:
1. When in doubt between positive and negative, choose neutral
2. Only classify as positive if you're confident it's genuinely positive
3. Only classify as negative if you're confident it's genuinely negative
4. It's better to be neutral than to misclassify sentiment polarity
5. Look for clear, unambiguous sentiment indicators
6. Consider the overall tone and likely reader reaction
7. Provide specific evidence for your classification

The text may be in English, Hindi, or Gujarati. Analyze the sentiment regardless of language.

Remember: Accuracy over aggressiveness. Never misclassify positive as negative or negative as positive.`
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

      // Use AI predictions directly
      return {
        headingSentiment: aiSentimentData.headingSentiment || 'Neutral',
        headingSentimentReason: aiSentimentData.headingSentimentReason || 'No specific reasoning provided',
        contentSentiment: aiSentimentData.contentSentiment || 'Neutral',
        contentSentimentReason: aiSentimentData.contentSentimentReason || 'No specific reasoning provided',
        confidence: aiSentimentData.confidence || 'medium',
        method: 'ai_primary'
      }
    } catch (error) {
      console.error('❌ Error analyzing sentiment with Azure OpenAI:', error)
      console.error('❌ Error details:', error.message)
      
      // Check if it's a content policy violation
      const isContentPolicyViolation = error.message && (
        error.message.includes('content management policy') ||
        error.message.includes('content filtering') ||
        error.message.includes('content policy') ||
        error.message.includes('filtered due to the prompt')
      )
      
      if (isContentPolicyViolation) {
        console.log('🔄 Content policy violation detected, using enhanced local analysis')
        // For content policy violations, use a more conservative local analysis
        const headingLocal = this.analyzeLocalSentimentConservative(heading)
        const contentLocal = this.analyzeLocalSentimentConservative(content)
        
        return {
          headingSentiment: headingLocal.sentiment,
          headingSentimentReason: `Local analysis (AI blocked): ${headingLocal.reason}`,
          contentSentiment: contentLocal.sentiment,
          contentSentimentReason: `Local analysis (AI blocked): ${contentLocal.reason}`,
          confidence: 'medium',
          method: 'local_content_policy_fallback'
        }
      }
      
      // Fallback to local analysis if AI fails
      console.log('🔄 AI failed, falling back to local sentiment analysis')
      const headingLocal = this.analyzeLocalSentiment(heading)
      const contentLocal = this.analyzeLocalSentiment(content)
      
      return {
        headingSentiment: headingLocal.sentiment,
        headingSentimentReason: `Local fallback: ${headingLocal.reason}`,
        contentSentiment: contentLocal.sentiment,
        contentSentimentReason: `Local fallback: ${contentLocal.reason}`,
        confidence: headingLocal.confidence === 'high' || contentLocal.confidence === 'high' ? 'high' : 
                   headingLocal.confidence === 'medium' || contentLocal.confidence === 'medium' ? 'medium' : 'low',
        method: 'local_fallback'
      }
    }
  }

  // Conservative local sentiment analysis for content policy violations
  analyzeLocalSentimentConservative(text) {
    if (!text || typeof text !== 'string') {
      return { sentiment: 'Neutral', score: 0, confidence: 'low', reason: 'No text provided' }
    }

    // For sensitive content, be more conservative and lean towards neutral
    const result = this.analyzeLocalSentiment(text)
    
    // If the content triggered a policy violation, it's likely sensitive
    // Be more conservative in classification
    if (result.sentiment === 'Positive' && result.confidence === 'low') {
      return {
        sentiment: 'Neutral',
        score: 0,
        confidence: 'medium',
        reason: 'Conservative classification due to sensitive content - avoiding positive misclassification'
      }
    }
    
    if (result.sentiment === 'Negative' && result.confidence === 'low') {
      return {
        sentiment: 'Neutral',
        score: 0,
        confidence: 'medium',
        reason: 'Conservative classification due to sensitive content - avoiding negative misclassification'
      }
    }
    
    // Only allow strong sentiment classifications for sensitive content
    if (result.confidence === 'low') {
      return {
        sentiment: 'Neutral',
        score: 0,
        confidence: 'medium',
        reason: 'Conservative neutral classification for sensitive content'
      }
    }
    
    return result
  }

  // The analyzeLocalSentiment method is already defined above at line 258



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
