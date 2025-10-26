import pdfParse from 'pdf-parse'
import fs from 'fs'
import sentimentAnalysis from './sentimentAnalysis.js'

class NewspaperProcessor {
  constructor() {
    console.log('📰 Newspaper Processor initialized')
  }

  // Main method to process entire newspaper
  async processNewspaper(filePath, newspaperName) {
    console.log(`📰 Starting comprehensive newspaper processing for: ${newspaperName}`)
    
    try {
      // Step 1: Extract raw text from PDF
      const rawText = await this.extractTextFromPDF(filePath)
      
      // Step 2: Detect language of the newspaper
      const dominantLanguage = this.detectDominantLanguage(rawText.text)
      console.log(`🌐 Detected dominant language: ${dominantLanguage}`)
      
      // Step 3: Extract individual articles with advanced techniques
      const articles = await this.extractArticles(rawText.text, dominantLanguage)
      console.log(`📄 Extracted ${articles.length} articles from newspaper`)
      
      // Step 4: Analyze sentiment for each article
      const analyzedArticles = await this.analyzeSentimentForArticles(articles)
      
      // Step 5: Categorize articles by sentiment
      const categorizedArticles = this.categorizeArticlesBySentiment(analyzedArticles)
      
      // Step 6: Generate comprehensive analysis
      const analysis = this.generateComprehensiveAnalysis(analyzedArticles, categorizedArticles, newspaperName)
      
      return {
        articles: analyzedArticles,
        categorizedArticles,
        analysis,
        totalArticles: analyzedArticles.length,
        dominantLanguage,
        processingStatus: 'completed'
      }
      
    } catch (error) {
      console.error('❌ Error processing newspaper:', error)
      throw new Error(`Failed to process newspaper: ${error.message}`)
    }
  }

  // Extract text from PDF without image conversion
  async extractTextFromPDF(filePath) {
    console.log('📄 Extracting text from PDF...')
    
    try {
      const dataBuffer = fs.readFileSync(filePath)
      const pdfData = await pdfParse(dataBuffer, {
        // Enhanced options for better text extraction
        normalizeWhitespace: false, // Keep original formatting
        disableCombineTextItems: false, // Allow text combination
        max: 0, // No page limit
      })
      
      console.log(`✅ PDF text extraction completed:`)
      console.log(`   - Total pages: ${pdfData.numpages}`)
      console.log(`   - Text length: ${pdfData.text.length} characters`)
      console.log(`   - Info: ${JSON.stringify(pdfData.info)}`)
      
      return {
        text: pdfData.text,
        pages: pdfData.numpages,
        info: pdfData.info,
        metadata: pdfData.metadata
      }
      
    } catch (error) {
      console.error('❌ Error extracting text from PDF:', error)
      throw new Error(`PDF text extraction failed: ${error.message}`)
    }
  }

  // Detect the dominant language of the newspaper
  detectDominantLanguage(text) {
    const sample = text.substring(0, 5000) // Use first 5000 characters for detection
    
    // Language detection patterns
    const patterns = {
      hindi: /[\u0900-\u097F]/g,
      gujarati: /[\u0A80-\u0AFF]/g,
      english: /[a-zA-Z]/g
    }
    
    const counts = {}
    Object.keys(patterns).forEach(lang => {
      const matches = sample.match(patterns[lang])
      counts[lang] = matches ? matches.length : 0
    })
    
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
    
    if (total === 0) return 'unknown'
    
    // Calculate percentages
    const percentages = {}
    Object.keys(counts).forEach(lang => {
      percentages[lang] = (counts[lang] / total) * 100
    })
    
    // Find dominant language (>40% threshold)
    const dominantLang = Object.entries(percentages)
      .sort(([,a], [,b]) => b - a)[0]
    
    console.log('🔍 Language detection results:', percentages)
    
    return dominantLang[1] > 40 ? dominantLang[0] : 'mixed'
  }

  // Advanced article extraction with multiple techniques
  async extractArticles(rawText, language) {
    console.log('📰 Starting advanced article extraction...')
    
    const text = rawText.text || rawText
    
    // Multiple extraction strategies
    const strategies = [
      this.extractByHeadlinePatterns.bind(this),
      this.extractByStructuralPatterns.bind(this),
      this.extractByLanguageSpecificPatterns.bind(this),
      this.extractByContentBlocks.bind(this)
    ]
    
    let allArticles = []
    
    for (const strategy of strategies) {
      try {
        const articles = await strategy(text, language)
        allArticles = allArticles.concat(articles)
      } catch (error) {
        console.warn(`⚠️ Strategy failed: ${error.message}`)
      }
    }
    
    // Remove duplicates and merge similar articles
    const uniqueArticles = this.deduplicateArticles(allArticles)
    
    // Filter and validate articles
    const validArticles = this.validateAndFilterArticles(uniqueArticles)
    
    console.log(`✅ Article extraction completed: ${validArticles.length} valid articles found`)
    
    return validArticles
  }

  // Strategy 1: Extract by headline patterns
  extractByHeadlinePatterns(text, language) {
    console.log('🔍 Extracting articles by headline patterns...')
    
    const articles = []
    
    // Define headline patterns based on language
    const headlinePatterns = {
      english: [
        /^[A-Z][A-Z\s,.-]{15,80}$/gm, // All caps headlines
        /^[A-Z][a-zA-Z\s,.-]{20,100}$/gm, // Title case headlines
        /^\d+\.\s*[A-Z][a-zA-Z\s,.-]{15,80}$/gm, // Numbered headlines
      ],
      hindi: [
        /^[\u0900-\u097F\s]{10,80}$/gm, // Hindi headlines
        /^\d+\.\s*[\u0900-\u097F\s]{10,80}$/gm, // Numbered Hindi headlines
      ],
      gujarati: [
        /^[\u0A80-\u0AFF\s]{10,80}$/gm, // Gujarati headlines
        /^\d+\.\s*[\u0A80-\u0AFF\s]{10,80}$/gm, // Numbered Gujarati headlines
      ]
    }
    
    const patterns = headlinePatterns[language] || headlinePatterns.english
    
    patterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)]
      matches.forEach(match => {
        const headline = match[0].trim()
        const startIndex = match.index
        
        // Extract content after headline (next 500-2000 characters)
        const contentStart = startIndex + headline.length
        const contentEnd = Math.min(contentStart + 2000, text.length)
        let content = text.substring(contentStart, contentEnd).trim()
        
        // Find natural ending (sentence or paragraph break)
        const naturalEnd = this.findNaturalContentEnd(content)
        if (naturalEnd > 100) {
          content = content.substring(0, naturalEnd)
        }
        
        if (content.length > 50 && headline.length > 10) {
          articles.push({
            headline: headline.replace(/^\d+\.\s*/, ''), // Remove numbering
            content,
            extractionMethod: 'headline-pattern',
            confidence: 0.8,
            startIndex,
            language: this.detectTextLanguage(headline + ' ' + content)
          })
        }
      })
    })
    
    return articles
  }

  // Strategy 2: Extract by structural patterns
  extractByStructuralPatterns(text, language) {
    console.log('🔍 Extracting articles by structural patterns...')
    
    const articles = []
    
    // Enhanced delimiters for newspaper content
    const delimiters = [
      /\n\s*\n\s*\n/g, // Triple line breaks (common between articles)
      /\n\s*[-=_]{5,}\s*\n/g, // Separator lines
      /\n\s*\*{3,}\s*\n/g, // Star separators
      /\n\s*Page\s+\d+\s*\n/gi, // Page breaks
      /\n\s*(?:पृष्ठ|પેજ)\s*\d+\s*\n/gi, // Hindi/Gujarati page breaks
      /\n\s*(?:Continued on|Continued from|Turn to)\s+(?:Page|पृष्ठ|પેજ)\s*\d+/gi, // Article continuation markers
      /\n\s*(?:Bureau|Staff Reporter|Correspondent|संवाददाता|સંવાદદાતા)\s*\n/gi, // Byline patterns
    ]
    
    let segments = [text]
    
    // Apply delimiters sequentially
    delimiters.forEach(delimiter => {
      const newSegments = []
      segments.forEach(segment => {
        newSegments.push(...segment.split(delimiter))
      })
      segments = newSegments.filter(s => s.trim().length > 200) // Increased minimum segment length
    })
    
    // Further split large segments by paragraph patterns
    const refinedSegments = []
    segments.forEach(segment => {
      if (segment.length > 3000) {
        // Split very large segments by looking for headline patterns
        const headlinePattern = /\n\s*([A-Z][A-Z\s,.-]{20,100}|[\u0900-\u097F\u0A80-\u0AFF\s]{15,80})\s*\n/g
        const parts = segment.split(headlinePattern)
        
        for (let i = 0; i < parts.length; i += 2) {
          const content = parts[i]
          const headline = parts[i + 1]
          
          if (content && content.trim().length > 200) {
            refinedSegments.push(content.trim())
          }
          
          if (headline && parts[i + 2]) {
            refinedSegments.push(headline + '\n' + parts[i + 2])
          }
        }
      } else {
        refinedSegments.push(segment)
      }
    })
    
    refinedSegments.forEach((segment, index) => {
      const lines = segment.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      
      if (lines.length < 5) return // Need at least 5 lines for a proper article
      
      // Enhanced headline detection
      let headline = ''
      let contentLines = []
      let headlineIndex = -1
      
      // Look for the best headline candidate in first few lines
      for (let i = 0; i < Math.min(8, lines.length); i++) {
        const line = lines[i]
        
        // Skip very short lines, dates, and bylines
        if (line.length < 20 || line.length > 150) continue
        if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(line)) continue
        if (/^(By|From|Bureau|Staff|Correspondent|संवाददाता|સંવાદદાતા)/i.test(line)) continue
        
        // Check if this looks like a proper headline
        const isAllCaps = line === line.toUpperCase() && /[A-Z]/.test(line)
        const hasTitleCase = /^[A-Z]/.test(line) && /[a-z]/.test(line)
        const hasMinimalPunctuation = (line.match(/[.!?]/g) || []).length <= 1
        const hasNewsKeywords = /\b(announces|says|reports|launches|opens|closes|wins|loses|dies|born|elected|appointed|arrested|convicted)\b/i.test(line)
        
        if ((isAllCaps || hasTitleCase) && hasMinimalPunctuation && (hasNewsKeywords || line.length >= 30)) {
          headline = line
          headlineIndex = i
          contentLines = lines.slice(i + 1)
          break
        }
      }
      
      // Fallback: use first substantial line
      if (!headline && lines.length > 0) {
        headline = lines[0]
        headlineIndex = 0
        contentLines = lines.slice(1)
      }
      
      // Clean and join content
      const content = contentLines
        .filter(line => line.length > 10) // Remove very short lines
        .join(' ')
        .trim()
      
      // Validate article quality
      if (content.length > 200 && headline.length > 20) {
        const wordCount = content.split(/\s+/).length
        
        // Check for news article characteristics
        const hasQuotes = /["']/.test(content)
        const hasNewsWords = /\b(said|told|according|reported|announced|declared|stated|mentioned|revealed|confirmed)\b/i.test(content)
        const hasProperNouns = (content.match(/\b[A-Z][a-z]+\b/g) || []).length > 5
        
        const confidence = 0.7 + 
          (hasQuotes ? 0.1 : 0) + 
          (hasNewsWords ? 0.1 : 0) + 
          (hasProperNouns ? 0.1 : 0)
        
        articles.push({
          headline: headline.replace(/^\d+\.\s*/, ''), // Remove numbering
          content,
          extractionMethod: 'structural-pattern',
          confidence: Math.min(confidence, 1.0),
          segmentIndex: index,
          wordCount,
          language: this.detectTextLanguage(headline + ' ' + content)
        })
      }
    })
    
    console.log(`📰 Structural extraction found ${articles.length} potential articles`)
    return articles
  }

  // Strategy 3: Language-specific patterns
  extractByLanguageSpecificPatterns(text, language) {
    console.log(`🔍 Extracting articles using ${language}-specific patterns...`)
    
    const articles = []
    
    // Language-specific article markers
    const markers = {
      english: [
        /\b(?:BREAKING|NEWS|REPORT|EXCLUSIVE|UPDATE):\s*/gi,
        /\b(?:By|From)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/g,
        /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+/gi,
      ],
      hindi: [
        /(?:समाचार|खबर|रिपोर्ट|अपडेट):\s*/g,
        /(?:सोमवार|मंगलवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार),?\s+/g,
      ],
      gujarati: [
        /(?:સમાચાર|ખબર|રિપોર્ટ|અપડેટ):\s*/g,
        /(?:સોમવાર|મંગળવાર|બુધવાર|ગુરુવાર|શુક્રવાર|શનિવાર|રવિવાર),?\s+/g,
      ]
    }
    
    const languageMarkers = markers[language] || markers.english
    
    languageMarkers.forEach(marker => {
      const matches = [...text.matchAll(marker)]
      matches.forEach(match => {
        const startIndex = match.index
        
        // Extract surrounding context
        const contextStart = Math.max(0, startIndex - 200)
        const contextEnd = Math.min(text.length, startIndex + 1500)
        const context = text.substring(contextStart, contextEnd)
        
        // Find headline and content
        const lines = context.split('\n').map(line => line.trim()).filter(line => line.length > 0)
        
        if (lines.length >= 2) {
          const headline = lines[0]
          const content = lines.slice(1).join(' ').trim()
          
          if (content.length > 100 && headline.length > 10) {
            articles.push({
              headline,
              content,
              extractionMethod: 'language-specific',
              confidence: 0.75,
              marker: match[0],
              language: this.detectTextLanguage(headline + ' ' + content)
            })
          }
        }
      })
    })
    
    return articles
  }

  // Strategy 4: Extract by content blocks
  extractByContentBlocks(text, language) {
    console.log('🔍 Extracting articles by content blocks...')
    
    const articles = []
    
    // Split text into paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 50)
    
    let currentArticle = null
    
    paragraphs.forEach((paragraph, index) => {
      const lines = paragraph.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      
      if (lines.length === 0) return
      
      const firstLine = lines[0]
      
      // Check if this looks like a headline
      const isHeadline = this.isLikelyHeadline(firstLine, language)
      
      if (isHeadline && currentArticle) {
        // Save previous article
        if (currentArticle.content.length > 100) {
          articles.push(currentArticle)
        }
        currentArticle = null
      }
      
      if (isHeadline) {
        // Start new article
        currentArticle = {
          headline: firstLine,
          content: lines.slice(1).join(' ').trim(),
          extractionMethod: 'content-blocks',
          confidence: 0.6,
          paragraphIndex: index,
          language: this.detectTextLanguage(paragraph)
        }
      } else if (currentArticle) {
        // Add to current article
        currentArticle.content += ' ' + lines.join(' ')
      }
    })
    
    // Don't forget the last article
    if (currentArticle && currentArticle.content.length > 100) {
      articles.push(currentArticle)
    }
    
    return articles
  }

  // Helper: Check if text looks like a headline
  isLikelyHeadline(text, language) {
    // Length check
    if (text.length < 10 || text.length > 150) return false
    
    // Check for headline characteristics
    const hasCapitalization = /^[A-Z\u0900-\u097F\u0A80-\u0AFF]/.test(text)
    const hasEndPunctuation = /[.!?]$/.test(text)
    const wordCount = text.split(/\s+/).length
    
    // Headlines typically don't end with periods and have 3-20 words
    return hasCapitalization && !hasEndPunctuation && wordCount >= 3 && wordCount <= 20
  }

  // Helper: Find natural content ending
  findNaturalContentEnd(content) {
    // Look for sentence endings
    const sentences = content.match(/[.!?]+/g)
    if (sentences && sentences.length > 2) {
      const lastSentenceIndex = content.lastIndexOf(sentences[Math.floor(sentences.length * 0.8)])
      if (lastSentenceIndex > 200) {
        return lastSentenceIndex + 1
      }
    }
    
    // Look for paragraph breaks
    const paragraphBreak = content.indexOf('\n\n')
    if (paragraphBreak > 200) {
      return paragraphBreak
    }
    
    return content.length
  }

  // Helper: Detect language of specific text
  detectTextLanguage(text) {
    const sample = text.substring(0, 200)
    
    const patterns = {
      hindi: /[\u0900-\u097F]/g,
      gujarati: /[\u0A80-\u0AFF]/g,
      english: /[a-zA-Z]/g
    }
    
    const counts = {}
    Object.keys(patterns).forEach(lang => {
      const matches = sample.match(patterns[lang])
      counts[lang] = matches ? matches.length : 0
    })
    
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
    if (total === 0) return 'unknown'
    
    const maxLang = Object.entries(counts).sort(([,a], [,b]) => b - a)[0]
    return maxLang[1] / total > 0.3 ? maxLang[0] : 'mixed'
  }

  // Remove duplicate articles and merge split articles
  deduplicateArticles(articles) {
    console.log(`🔄 Deduplicating and merging ${articles.length} articles...`)
    
    const unique = []
    const seenSignatures = new Map()
    
    // Sort articles by extraction method confidence and content length
    const sortedArticles = articles.sort((a, b) => {
      const scoreA = (a.confidence || 0.5) * a.content.length
      const scoreB = (b.confidence || 0.5) * b.content.length
      return scoreB - scoreA
    })
    
    sortedArticles.forEach(article => {
      // Create a signature for the article
      const signature = this.createArticleSignature(article)
      
      // Check for similar articles (potential splits)
      let merged = false
      for (const [existingSignature, existingArticle] of seenSignatures.entries()) {
        const similarity = this.calculateSimilarity(signature, existingSignature)
        
        // If articles are very similar (likely the same article split), merge them
        if (similarity > 0.7) {
          console.log(`🔗 Merging similar articles: "${article.headline.substring(0, 50)}..." with "${existingArticle.headline.substring(0, 50)}..."`)
          
          // Keep the better headline (longer and more descriptive)
          if (article.headline.length > existingArticle.headline.length) {
            existingArticle.headline = article.headline
          }
          
          // Merge content (avoid duplication)
          const combinedContent = this.mergeContent(existingArticle.content, article.content)
          existingArticle.content = combinedContent
          existingArticle.wordCount = combinedContent.split(/\s+/).length
          
          // Update confidence to higher value
          existingArticle.confidence = Math.max(existingArticle.confidence || 0.5, article.confidence || 0.5)
          
          merged = true
          break
        }
      }
      
      // If not merged, add as new unique article
      if (!merged && !seenSignatures.has(signature)) {
        seenSignatures.set(signature, article)
        unique.push(article)
      }
    })
    
    console.log(`✅ Deduplicated and merged to ${unique.length} unique articles`)
    return unique
  }

  // Create article signature for deduplication
  createArticleSignature(article) {
    const headlineWords = article.headline.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5)
      .sort()
      .join(' ')
    
    const contentWords = article.content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 4)
      .slice(0, 10)
      .sort()
      .join(' ')
    
    return `${headlineWords}|${contentWords}`
  }

  // Calculate similarity between two article signatures
  calculateSimilarity(signature1, signature2) {
    const words1 = new Set(signature1.split(/[|\s]+/))
    const words2 = new Set(signature2.split(/[|\s]+/))
    
    const intersection = new Set([...words1].filter(word => words2.has(word)))
    const union = new Set([...words1, ...words2])
    
    return intersection.size / union.size
  }

  // Merge content from two articles, avoiding duplication
  mergeContent(content1, content2) {
    const sentences1 = content1.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10)
    const sentences2 = content2.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10)
    
    const allSentences = [...sentences1]
    
    // Add sentences from content2 that are not similar to any in content1
    sentences2.forEach(sentence2 => {
      const isUnique = !sentences1.some(sentence1 => {
        const similarity = this.calculateTextSimilarity(sentence1.toLowerCase(), sentence2.toLowerCase())
        return similarity > 0.8
      })
      
      if (isUnique) {
        allSentences.push(sentence2)
      }
    })
    
    return allSentences.join('. ').trim()
  }

  // Calculate text similarity between two strings
  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.split(/\s+/))
    const words2 = new Set(text2.split(/\s+/))
    
    const intersection = new Set([...words1].filter(word => words2.has(word)))
    const union = new Set([...words1, ...words2])
    
    return intersection.size / union.size
  }

  // Validate and filter articles
  validateAndFilterArticles(articles) {
    console.log(`🔍 Validating ${articles.length} articles...`)
    
    const valid = articles.filter(article => {
      // Minimum length requirements for proper news articles
      if (article.headline.length < 15 || article.content.length < 100) {
        return false
      }
      
      // Maximum length requirements (avoid extracting entire pages)
      if (article.headline.length > 200 || article.content.length > 8000) {
        return false
      }
      
      // Check for meaningful content - news articles should have substantial content
      const words = article.content.split(/\s+/).filter(word => word.length > 2)
      if (words.length < 50) { // Increased minimum word count for proper articles
        return false
      }
      
      // Check headline quality - should be proper news headline
      const headlineWords = article.headline.split(/\s+/)
      if (headlineWords.length < 4 || headlineWords.length > 20) {
        return false
      }
      
      // Filter out non-article content (ads, headers, footers, dates, etc.)
      const lowercaseHeadline = article.headline.toLowerCase()
      const lowercaseContent = article.content.toLowerCase()
      
      // Skip common non-article patterns including dates
      const skipPatterns = [
        /^(page|पृष्ठ|પેજ)\s*\d+/i,
        /^(advertisement|विज्ञापन|જાહેરાત)/i,
        /^(classified|वर्गीकृत|વર્ગીકૃત)/i,
        /^(weather|मौसम|હવામાન)/i,
        /^(horoscope|राशिफल|રાશિફળ)/i,
        /^(sports score|खेल स्कोर|રમત સ્કોર)/i,
        /^(stock market|शेयर बाजार|શેર બજાર)/i,
        // Date patterns - various formats
        /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i,
        /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/i,
        /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i,
        /^\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/i,
        // Hindi date patterns
        /^(सोमवार|मंगलवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार)/i,
        // Gujarati date patterns
        /^(સોમવાર|મંગળવાર|બુધવાર|ગુરુવાર|શુક્રવાર|શનિવાર|રવિવાર)/i,
        // Edition/City names
        /^(delhi|mumbai|bangalore|chennai|kolkata|hyderabad|pune|ahmedabad|surat|vadodara)\s+(edition|एडिशन|આવૃત્તિ)/i,
        // Price patterns
        /^(price|मूल्य|કિંમત)[:]\s*[₹$]\s*\d+/i,
        // Volume/Issue patterns
        /^(volume|vol|अंक|વોલ્યુમ)\s*\d+/i
      ]
      
      for (const pattern of skipPatterns) {
        if (pattern.test(lowercaseHeadline) || pattern.test(lowercaseContent.substring(0, 100))) {
          return false
        }
      }
      
      // Additional check: if headline is mostly a date
      const dateWords = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 
                        'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 
                        'september', 'october', 'november', 'december', 'सोमवार', 'मंगलवार', 'बुधवार', 
                        'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार', 'સોમવાર', 'મંગળવાર', 'બુધવાર', 
                        'ગુરુવાર', 'શુક્રવાર', 'શનિવાર', 'રવિવાર']
      
      const headlineWordsForDateCheck = lowercaseHeadline.split(/\s+/)
      const dateWordCount = headlineWordsForDateCheck.filter(word => dateWords.includes(word) || /^\d{1,2}$/.test(word) || /^\d{4}$/.test(word)).length
      
      if (dateWordCount >= headlineWordsForDateCheck.length * 0.5) { // If 50% or more words are date-related
        return false
      }
      
      // Check for news article indicators
      const newsIndicators = [
        /\b(said|says|told|reported|according to|sources|officials|minister|government|police|court|announced|declared)\b/i,
        /\b(कहा|बताया|रिपोर्ट|अनुसार|सूत्र|अधिकारी|मंत्री|सरकार|पुलिस|न्यायालय|घोषणा)\b/i,
        /\b(કહ્યું|જણાવ્યું|રિપોર્ટ|અનુસાર|સૂત્ર|અધિકારી|મંત્રી|સરકાર|પોલીસ|કોર્ટ|જાહેરાત)\b/i
      ]
      
      const hasNewsIndicators = newsIndicators.some(pattern => 
        pattern.test(article.content.substring(0, 500))
      )
      
      // Require news indicators for proper articles
      if (!hasNewsIndicators && words.length < 100) {
        return false
      }
      
      return true
    })
    
    // Sort by confidence and content quality, prioritizing longer, more substantial articles
    valid.sort((a, b) => {
      const scoreA = (a.confidence || 0.5) * Math.log(a.content.length + 1) * (a.wordCount || a.content.split(/\s+/).length)
      const scoreB = (b.confidence || 0.5) * Math.log(b.content.length + 1) * (b.wordCount || b.content.split(/\s+/).length)
      return scoreB - scoreA
    })
    
    console.log(`✅ Validated ${valid.length} high-quality news articles`)
    return valid
  }

  // Analyze sentiment for all articles and generate proper headlines
  async analyzeSentimentForArticles(articles) {
    console.log(`🧠 Analyzing sentiment and generating headlines for ${articles.length} articles...`)
    
    const analyzed = []
    
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i]
      console.log(`📊 Processing article ${i + 1}/${articles.length}: "${article.headline.substring(0, 50)}..."`)
      
      try {
        // Generate proper headline and analyze sentiment
        const result = await this.generateHeadlineAndAnalyzeSentiment(article.headline, article.content)
        
        analyzed.push({
          ...article,
          id: `article_${i + 1}`,
          originalHeadline: article.headline, // Keep original for reference
          headline: result.generatedHeadline, // Use AI-generated headline
          headingSentiment: result.headingSentiment,
          headingSentimentReason: result.headingSentimentReason,
          contentSentiment: result.contentSentiment,
          contentSentimentReason: result.contentSentimentReason,
          overallSentiment: result.contentSentiment, // Use content sentiment as primary
          sentimentConfidence: result.confidence,
          wordCount: article.content.split(/\s+/).length,
          analysisDate: new Date()
        })
        
        // Add delay to avoid rate limiting
        if (i < articles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500))
        }
        
      } catch (error) {
        console.error(`❌ Error processing article ${i + 1}:`, error)
        
        // Add with default values
        analyzed.push({
          ...article,
          id: `article_${i + 1}`,
          originalHeadline: article.headline,
          headline: this.generateFallbackHeadline(article.content), // Generate simple fallback
          headingSentiment: 'Neutral',
          headingSentimentReason: 'Analysis failed - using default classification',
          contentSentiment: 'Neutral',
          contentSentimentReason: 'Analysis failed - using default classification',
          overallSentiment: 'Neutral',
          sentimentConfidence: 'low',
          wordCount: article.content.split(/\s+/).length,
          analysisDate: new Date(),
          analysisError: error.message
        })
      }
    }
    
    console.log(`✅ Sentiment analysis and headline generation completed for ${analyzed.length} articles`)
    return analyzed
  }

  // Generate headline using AI and analyze sentiment
  async generateHeadlineAndAnalyzeSentiment(originalHeadline, content) {
    console.log('🤖 Generating headline and analyzing sentiment with AI...')
    
    // Prepare content sample (first 800 characters for context)
    const contentSample = content.substring(0, 800)
    
    const prompt = `You are an expert news headline generator and sentiment analyst. Based on the article content provided, generate a clear, concise news headline and analyze the sentiment.

Original headline (for reference): "${originalHeadline}"

Article content:
${contentSample}

Please provide your response in this exact JSON format:
{
  "generatedHeadline": "A clear, concise news headline (5-15 words) that accurately represents the main story",
  "headingSentiment": "Positive|Negative|Neutral",
  "headingSentimentReason": "Brief explanation of why the headline has this sentiment",
  "contentSentiment": "Positive|Negative|Neutral", 
  "contentSentimentReason": "Brief explanation of why the content has this sentiment",
  "confidence": "high|medium|low"
}

Guidelines:
- Generate a headline that captures the main news story
- Keep headline between 5-15 words
- Make it similar in style to the original but clearer and more concise
- Sentiment should be Positive (good news, achievements, progress), Negative (problems, conflicts, failures), or Neutral (factual reporting, balanced coverage)
- Provide clear reasoning for sentiment classification`

    try {
      const response = await fetch(`${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`, {
        method: 'POST',
        headers: {
          'api-key': process.env.AZURE_OPENAI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are an expert news headline generator and sentiment analyst. Always respond with valid JSON in the exact format requested.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.3
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      const analysisText = data.choices[0].message.content

      // Parse JSON response
      let cleanedText = analysisText.trim()
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      const result = JSON.parse(cleanedText)
      
      // Validate the result
      if (!result.generatedHeadline || !result.headingSentiment || !result.contentSentiment) {
        throw new Error('Invalid response format from AI')
      }
      
      console.log(`✅ Generated headline: "${result.generatedHeadline}"`)
      return result
      
    } catch (error) {
      console.error('❌ Error in AI headline generation:', error)
      
      // Fallback to original sentiment analysis
      const sentiment = await sentimentAnalysis.analyzeSentiment(originalHeadline, content)
      return {
        generatedHeadline: this.generateFallbackHeadline(content),
        headingSentiment: sentiment.headingSentiment,
        headingSentimentReason: sentiment.headingSentimentReason,
        contentSentiment: sentiment.contentSentiment,
        contentSentimentReason: sentiment.contentSentimentReason,
        confidence: 'low'
      }
    }
  }

  // Generate a simple fallback headline from content
  generateFallbackHeadline(content) {
    // Extract first sentence and clean it up
    const sentences = content.split(/[.!?]+/)
    let headline = sentences[0]?.trim() || 'News Article'
    
    // Clean up the headline
    headline = headline
      .replace(/^(By|From|Bureau|Staff|Correspondent|संवाददाता|સંવાદદાતા).*/i, '') // Remove bylines
      .replace(/^\d+[-\/]\d+[-\/]\d+.*/i, '') // Remove dates
      .replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday).*/i, '') // Remove day names
      .trim()
    
    // Limit length
    const words = headline.split(/\s+/)
    if (words.length > 12) {
      headline = words.slice(0, 12).join(' ') + '...'
    }
    
    return headline || 'News Article'
  }

  // Categorize articles by sentiment
  categorizeArticlesBySentiment(articles) {
    console.log('📊 Categorizing articles by sentiment...')
    
    const categories = {
      positive: [],
      negative: [],
      neutral: []
    }
    
    articles.forEach(article => {
      const sentiment = article.overallSentiment.toLowerCase()
      if (categories[sentiment]) {
        categories[sentiment].push({
          id: article.id,
          headline: article.headline,
          content: article.content.substring(0, 300) + '...', // Truncate for overview
          reason: article.contentSentimentReason,
          confidence: article.sentimentConfidence,
          wordCount: article.wordCount,
          language: article.language,
          extractionMethod: article.extractionMethod
        })
      }
    })
    
    console.log(`📊 Categorization complete:`)
    console.log(`   - Positive: ${categories.positive.length} articles`)
    console.log(`   - Negative: ${categories.negative.length} articles`)
    console.log(`   - Neutral: ${categories.neutral.length} articles`)
    
    return categories
  }

  // Generate comprehensive analysis
  generateComprehensiveAnalysis(articles, categorizedArticles, newspaperName) {
    console.log('📈 Generating comprehensive analysis...')
    
    const totalArticles = articles.length
    const sentimentCounts = {
      positive: categorizedArticles.positive.length,
      negative: categorizedArticles.negative.length,
      neutral: categorizedArticles.neutral.length
    }
    
    // Calculate sentiment percentages
    const sentimentPercentages = {}
    Object.keys(sentimentCounts).forEach(sentiment => {
      sentimentPercentages[sentiment] = totalArticles > 0 
        ? Math.round((sentimentCounts[sentiment] / totalArticles) * 100) 
        : 0
    })
    
    // Determine overall newspaper sentiment
    const maxSentiment = Object.entries(sentimentCounts)
      .sort(([,a], [,b]) => b - a)[0]
    
    const overallSentiment = maxSentiment[1] > 0 ? maxSentiment[0] : 'neutral'
    
    // Calculate sentiment score (-100 to +100)
    const sentimentScore = Math.round(
      ((sentimentCounts.positive - sentimentCounts.negative) / totalArticles) * 100
    )
    
    // Language analysis
    const languageCounts = {}
    articles.forEach(article => {
      const lang = article.language || 'unknown'
      languageCounts[lang] = (languageCounts[lang] || 0) + 1
    })
    
    // Quality metrics
    const avgWordCount = Math.round(
      articles.reduce((sum, article) => sum + article.wordCount, 0) / totalArticles
    )
    
    const avgConfidence = articles.reduce((sum, article) => {
      const conf = article.sentimentConfidence === 'high' ? 3 
                 : article.sentimentConfidence === 'medium' ? 2 : 1
      return sum + conf
    }, 0) / totalArticles
    
    const qualityScore = Math.round(
      (avgWordCount / 10) + // Word count factor
      (avgConfidence * 20) + // Confidence factor
      (totalArticles * 2) + // Article count factor
      (Object.keys(languageCounts).length * 5) // Language diversity factor
    )
    
    return {
      summary: {
        newspaperName,
        totalArticles,
        overallSentiment,
        sentimentScore,
        qualityScore: Math.min(100, qualityScore),
        analysisDate: new Date()
      },
      sentimentDistribution: {
        counts: sentimentCounts,
        percentages: sentimentPercentages
      },
      languageDistribution: languageCounts,
      qualityMetrics: {
        averageWordCount: avgWordCount,
        averageConfidence: avgConfidence,
        extractionMethods: [...new Set(articles.map(a => a.extractionMethod))],
        confidenceDistribution: {
          high: articles.filter(a => a.sentimentConfidence === 'high').length,
          medium: articles.filter(a => a.sentimentConfidence === 'medium').length,
          low: articles.filter(a => a.sentimentConfidence === 'low').length
        }
      },
      insights: this.generateInsights(articles, categorizedArticles, sentimentPercentages),
      recommendations: this.generateRecommendations(sentimentPercentages, qualityScore, totalArticles)
    }
  }

  // Generate insights
  generateInsights(articles, categorizedArticles, sentimentPercentages) {
    const insights = []
    
    // Sentiment insights
    if (sentimentPercentages.positive > 60) {
      insights.push('The newspaper shows predominantly positive coverage, indicating optimistic editorial stance')
    } else if (sentimentPercentages.negative > 60) {
      insights.push('The newspaper demonstrates critical coverage with predominantly negative sentiment')
    } else {
      insights.push('The newspaper maintains balanced coverage across different sentiment categories')
    }
    
    // Content insights
    const avgWordCount = articles.reduce((sum, a) => sum + a.wordCount, 0) / articles.length
    if (avgWordCount > 200) {
      insights.push('Articles show in-depth coverage with comprehensive content analysis')
    } else if (avgWordCount < 100) {
      insights.push('Articles are concise, indicating summary-style or breaking news format')
    }
    
    // Language insights
    const languages = [...new Set(articles.map(a => a.language))]
    if (languages.length > 1) {
      insights.push(`Multilingual publication detected with ${languages.length} languages, serving diverse readership`)
    }
    
    // Quality insights
    const highConfidenceArticles = articles.filter(a => a.sentimentConfidence === 'high').length
    const confidenceRate = (highConfidenceArticles / articles.length) * 100
    if (confidenceRate > 80) {
      insights.push('High-quality sentiment analysis with strong confidence indicators')
    }
    
    return insights
  }

  // Generate recommendations
  generateRecommendations(sentimentPercentages, qualityScore, totalArticles) {
    const recommendations = []
    
    // Sentiment balance recommendations
    if (sentimentPercentages.positive > 80) {
      recommendations.push('Consider including more critical analysis to maintain journalistic balance')
    } else if (sentimentPercentages.negative > 80) {
      recommendations.push('Balance negative coverage with positive developments for comprehensive reporting')
    }
    
    // Content quality recommendations
    if (qualityScore < 60) {
      recommendations.push('Focus on improving article depth and analytical quality')
    }
    
    // Coverage recommendations
    if (totalArticles < 10) {
      recommendations.push('Increase article count for more comprehensive news coverage')
    } else if (totalArticles > 50) {
      recommendations.push('Excellent comprehensive coverage across multiple topics')
    }
    
    // Default recommendations
    recommendations.push('Continue monitoring sentiment trends for editorial consistency')
    recommendations.push('Regular analysis helps identify reader engagement patterns')
    
    return recommendations
  }
}

export default new NewspaperProcessor()
