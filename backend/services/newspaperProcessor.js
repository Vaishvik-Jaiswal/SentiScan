import pdfParse from 'pdf-parse'
import fs from 'fs'
import sentimentAnalysis from './sentimentAnalysis.js'

/**
 * @typedef {Object} PDFData
 * @property {number} numpages - Number of pages in the PDF
 * @property {string} text - Extracted text content
 * @property {Object} info - PDF metadata information
 * @property {Object} metadata - Additional PDF metadata
 */

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
      .sort(([, a], [, b]) => b - a)[0]

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

    for (const [index, strategy] of strategies.entries()) {
      try {
        console.log(`🔍 Running extraction strategy ${index + 1}/${strategies.length}...`)
        const articles = await strategy(text, language)
        console.log(`📄 Strategy ${index + 1} extracted ${articles.length} articles`)
        allArticles = allArticles.concat(articles)
      } catch (error) {
        console.warn(`⚠️ Strategy ${index + 1} failed: ${error.message}`)
      }
    }

    console.log(`📊 Total articles before deduplication: ${allArticles.length}`)

    // Remove duplicates and merge similar articles
    const uniqueArticles = this.deduplicateArticles(allArticles)

    // Filter and validate articles
    const validArticles = this.validateAndFilterArticles(uniqueArticles)

    console.log(`✅ Article extraction completed: ${validArticles.length} valid articles found from ${allArticles.length} initial extractions`)

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
      telugu: /[\u0C00-\u0C7F]/g,
      english: /[a-zA-Z]/g
    }

    const counts = {}
    Object.keys(patterns).forEach(lang => {
      const matches = sample.match(patterns[lang])
      counts[lang] = matches ? matches.length : 0
    })

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
    if (total === 0) return 'unknown'

    const maxLang = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]
    return maxLang[1] / total > 0.3 ? maxLang[0] : 'mixed'
  }

  // Remove duplicate articles and merge split articles
  deduplicateArticles(articles) {
    console.log(`🔄 Deduplicating and merging ${articles.length} articles...`)

    const unique = []
    const seenSignatures = new Map()
    const seenHeadlines = new Set()

    // Sort articles by extraction method confidence and content length
    const sortedArticles = articles.sort((a, b) => {
      const scoreA = (a.confidence || 0.5) * a.content.length
      const scoreB = (b.confidence || 0.5) * b.content.length
      return scoreB - scoreA
    })

    sortedArticles.forEach((article, index) => {
      // Create multiple signatures for better deduplication
      const contentSignature = this.createContentSignature(article)
      const headlineSignature = this.createHeadlineSignature(article)
      const combinedSignature = this.createArticleSignature(article)

      // Normalize headline for exact match checking
      const normalizedHeadline = article.headline.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      // Check for exact headline duplicates first
      if (seenHeadlines.has(normalizedHeadline)) {
        console.log(`🚫 Skipping duplicate headline: "${article.headline.substring(0, 50)}..."`)
        return
      }

      // Check for partial headline matches (very aggressive)
      const headlineWords = normalizedHeadline.split(' ').filter(word => word.length > 3)
      for (const existingHeadline of seenHeadlines) {
        const existingWords = existingHeadline.split(' ').filter(word => word.length > 3)
        const commonWords = headlineWords.filter(word => existingWords.includes(word))
        const similarity = commonWords.length / Math.max(headlineWords.length, existingWords.length)

        if (similarity > 0.7) { // 70% word overlap
          console.log(`🚫 Skipping similar headline (${(similarity * 100).toFixed(1)}% word overlap): "${article.headline.substring(0, 50)}..."`)
          return
        }
      }

      // Check for similar articles using multiple similarity checks
      let merged = false
      let bestMatch = null
      let bestSimilarity = 0

      for (const [existingSignature, existingArticle] of seenSignatures.entries()) {
        // Calculate multiple similarity scores
        const contentSimilarity = this.calculateSimilarity(contentSignature, this.createContentSignature(existingArticle))
        const headlineSimilarity = this.calculateSimilarity(headlineSignature, this.createHeadlineSignature(existingArticle))
        const combinedSimilarity = this.calculateSimilarity(combinedSignature, existingSignature)

        // Use weighted average with higher weight on content similarity
        const overallSimilarity = (contentSimilarity * 0.6) + (headlineSimilarity * 0.3) + (combinedSimilarity * 0.1)

        // Much more aggressive threshold for better deduplication
        if (overallSimilarity > 0.65 && overallSimilarity > bestSimilarity) {
          bestMatch = existingArticle
          bestSimilarity = overallSimilarity
          console.log(`🔍 Found potential duplicate: "${article.headline.substring(0, 30)}..." vs "${existingArticle.headline.substring(0, 30)}..." (${(overallSimilarity * 100).toFixed(1)}% similar)`)
        }
      }

      if (bestMatch && bestSimilarity > 0.65) {
        console.log(`🔗 Merging similar articles (${(bestSimilarity * 100).toFixed(1)}% similarity): "${article.headline.substring(0, 50)}..." with "${bestMatch.headline.substring(0, 50)}..."`)

        // Keep the better headline (longer and more descriptive)
        if (article.headline.length > bestMatch.headline.length) {
          // Remove old headline from set and add new one
          const oldNormalizedHeadline = bestMatch.headline.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
          seenHeadlines.delete(oldNormalizedHeadline)
          seenHeadlines.add(normalizedHeadline)
          bestMatch.headline = article.headline
        }

        // Merge content (avoid duplication)
        const combinedContent = this.mergeContent(bestMatch.content, article.content)
        bestMatch.content = combinedContent
        bestMatch.wordCount = combinedContent.split(/\s+/).length

        // Update confidence to higher value
        bestMatch.confidence = Math.max(bestMatch.confidence || 0.5, article.confidence || 0.5)

        merged = true
      }

      // If not merged, add as new unique article
      if (!merged) {
        seenSignatures.set(combinedSignature, article)
        seenHeadlines.add(normalizedHeadline)
        unique.push(article)
        console.log(`✅ Added unique article ${unique.length}: "${article.headline.substring(0, 50)}..."`)
      }
    })

    console.log(`✅ Deduplicated and merged to ${unique.length} unique articles from ${articles.length} original articles`)
    return unique
  }

  // Create article signature for deduplication
  createArticleSignature(article) {
    const headlineWords = article.headline.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 8) // Increased from 5 to 8 for better uniqueness
      .sort()
      .join(' ')

    const contentWords = article.content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 4)
      .slice(0, 15) // Increased from 10 to 15 for better uniqueness
      .sort()
      .join(' ')

    return `${headlineWords}|${contentWords}`
  }

  // Create content-specific signature for better deduplication
  createContentSignature(article) {
    const contentWords = article.content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 4)
      .filter(word => !this.isCommonWord(word)) // Filter out common words
      .slice(0, 30) // Increased from 20 to 30 for better uniqueness
      .sort()
      .join(' ')

    return contentWords
  }

  // Create headline-specific signature
  createHeadlineSignature(article) {
    const headlineWords = article.headline.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isCommonWord(word)) // Filter out common words
      .sort()
      .join(' ')

    return headlineWords
  }

  // Check if word is common and should be filtered out for signatures
  isCommonWord(word) {
    const commonWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use',
      'said', 'will', 'have', 'been', 'this', 'that', 'with', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were',
      'also', 'after', 'back', 'other', 'many', 'than', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like', 'into', 'him', 'has', 'two', 'more', 'very', 'what', 'know', 'just', 'first', 'get', 'over', 'think', 'also', 'your', 'work', 'life', 'only', 'can', 'still', 'should', 'after', 'being', 'now', 'made', 'before', 'here', 'through', 'when', 'where', 'much', 'go', 'me', 'world', 'too', 'any', 'may', 'say', 'most', 'way'
    ])

    return commonWords.has(word.toLowerCase())
  }

  // Final deduplication pass with strict similarity checking
  finalDeduplicationPass(articles) {
    console.log(`🔍 Final deduplication pass for ${articles.length} articles...`)

    const finalUnique = []
    const processedHeadlines = new Set()

    for (const article of articles) {
      // Create a very strict headline signature
      const strictHeadlineSignature = article.headline.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(word => word.length > 2)
        .sort()
        .join(' ')

      // Check for very similar headlines
      let isDuplicate = false
      for (const existingSignature of processedHeadlines) {
        const similarity = this.calculateTextSimilarity(strictHeadlineSignature, existingSignature)
        if (similarity > 0.8) { // Lowered threshold for more aggressive final pass
          console.log(`🚫 Final pass removing duplicate: "${article.headline.substring(0, 50)}..." (${(similarity * 100).toFixed(1)}% similar)`)
          isDuplicate = true
          break
        }
      }

      if (!isDuplicate) {
        processedHeadlines.add(strictHeadlineSignature)
        finalUnique.push(article)
      }
    }

    return finalUnique
  }

  // Detect newspaper type based on content characteristics
  detectNewspaperType(articles, avgWordCount, qualityRatio) {
    const totalArticles = articles.length
    
    // Count articles by language
    const languageCounts = articles.reduce((counts, article) => {
      const lang = article.language || 'unknown'
      counts[lang] = (counts[lang] || 0) + 1
      return counts
    }, {})
    
    const isMultilingual = Object.keys(languageCounts).length > 1
    const hasLocalLanguage = languageCounts.hindi > 0 || languageCounts.gujarati > 0
    
    // Analyze content depth
    const longArticles = articles.filter(a => a.content.split(/\s+/).length > 300).length
    const longArticleRatio = longArticles / totalArticles
    
    // Detect type based on characteristics
    if (avgWordCount > 250 && qualityRatio > 0.7 && longArticleRatio > 0.3) {
      return 'premium' // High-quality newspaper with in-depth articles
    } else if (avgWordCount > 180 && qualityRatio > 0.5) {
      return 'standard' // Regular daily newspaper
    } else if (avgWordCount < 120 && totalArticles > 200) {
      return 'tabloid' // Many short articles
    } else if (hasLocalLanguage && !isMultilingual) {
      return 'regional' // Regional language newspaper
    } else {
      return 'general' // General category
    }
  }

  // Estimate expected article count based on newspaper characteristics
  estimateExpectedArticleCount(articles) {
    console.log(`📊 Analyzing ${articles.length} articles to estimate expected count...`)
    
    // Analyze article characteristics
    const totalWordCount = articles.reduce((sum, article) => sum + article.content.split(/\s+/).length, 0)
    const avgWordCount = totalWordCount / articles.length
    
    // Analyze content quality indicators
    const highQualityArticles = articles.filter(article => {
      const hasNewsWords = /\b(said|says|told|reported|according|announced|declared|government|minister|court|police)\b/i.test(article.content)
      const hasQuotes = /["'].*["']/.test(article.content)
      const wordCount = article.content.split(/\s+/).length
      return hasNewsWords && wordCount > 100 && (hasQuotes || wordCount > 150)
    }).length
    
    const qualityRatio = highQualityArticles / articles.length
    
    // Estimate based on multiple factors
    let estimatedCount
    
    if (avgWordCount > 250) {
      // Long, detailed articles suggest a quality newspaper with fewer total articles
      estimatedCount = Math.floor(articles.length * 0.25) // Keep 25%
      console.log(`📰 Long articles detected (avg: ${Math.round(avgWordCount)} words) - expecting fewer, high-quality articles`)
    } else if (avgWordCount > 180) {
      // Medium-length articles
      estimatedCount = Math.floor(articles.length * 0.35) // Keep 35%
      console.log(`📰 Medium articles detected (avg: ${Math.round(avgWordCount)} words) - expecting moderate article count`)
    } else if (avgWordCount > 120) {
      // Shorter articles might indicate more articles or more fragments
      estimatedCount = Math.floor(articles.length * 0.45) // Keep 45%
      console.log(`📰 Short articles detected (avg: ${Math.round(avgWordCount)} words) - expecting more articles`)
    } else {
      // Very short articles likely indicate many fragments
      estimatedCount = Math.floor(articles.length * 0.3) // Keep 30%
      console.log(`📰 Very short articles detected (avg: ${Math.round(avgWordCount)} words) - likely many fragments`)
    }
    
    // Adjust based on quality ratio
    if (qualityRatio > 0.7) {
      estimatedCount = Math.floor(estimatedCount * 1.2) // Increase if high quality
      console.log(`📈 High quality ratio (${(qualityRatio * 100).toFixed(1)}%) - increasing estimate`)
    } else if (qualityRatio < 0.3) {
      estimatedCount = Math.floor(estimatedCount * 0.8) // Decrease if low quality
      console.log(`📉 Low quality ratio (${(qualityRatio * 100).toFixed(1)}%) - decreasing estimate`)
    }
    
    // Detect newspaper type and adjust accordingly
    const newspaperType = this.detectNewspaperType(articles, avgWordCount, qualityRatio)
    
    // Apply newspaper-type specific adjustments
    switch (newspaperType) {
      case 'premium': // High-quality, fewer articles
        estimatedCount = Math.max(20, Math.min(200, estimatedCount))
        break
      case 'standard': // Regular newspaper
        estimatedCount = Math.max(50, Math.min(400, estimatedCount))
        break
      case 'tabloid': // More articles, shorter content
        estimatedCount = Math.max(80, Math.min(600, estimatedCount))
        break
      case 'regional': // Variable, depends on size
        estimatedCount = Math.max(30, Math.min(300, estimatedCount))
        break
      default: // General bounds
        estimatedCount = Math.max(20, Math.min(500, estimatedCount))
    }
    
    console.log(`📰 Detected newspaper type: ${newspaperType}`)
    
    console.log(`🎯 Final estimate: ${estimatedCount} articles (${(estimatedCount/articles.length*100).toFixed(1)}% of extracted)`)
    console.log(`📊 Analysis: avg_words=${Math.round(avgWordCount)}, quality=${(qualityRatio*100).toFixed(1)}%, type=${newspaperType}`)
    
    return estimatedCount
  }

  // Apply quality-based filtering to reduce article count to target
  applyQualityBasedFiltering(articles, targetCount) {
    console.log(`🎯 Applying quality-based filtering to reduce from ${articles.length} to ~${targetCount} articles`)

    // Score articles based on multiple quality factors
    const scoredArticles = articles.map(article => {
      let score = 0

      // Content length score (prefer substantial articles)
      const wordCount = article.content.split(/\s+/).length
      if (wordCount > 150) score += 3
      else if (wordCount > 100) score += 2
      else if (wordCount > 80) score += 1

      // Headline quality score
      const headlineWords = article.headline.split(/\s+/).length
      if (headlineWords >= 6 && headlineWords <= 15) score += 2
      else if (headlineWords >= 4 && headlineWords <= 20) score += 1

      // News indicators score
      const newsWords = /\b(said|says|told|reported|according|announced|declared|government|minister|court|police)\b/i
      if (newsWords.test(article.content)) score += 2

      // Confidence score
      if (article.confidence > 0.8) score += 2
      else if (article.confidence > 0.6) score += 1

      // Language clarity (avoid fragmented text)
      const fragmentedText = /\s{2,}|\n{2,}|[A-Z]\s+[A-Z]\s+[A-Z]/
      if (!fragmentedText.test(article.content)) score += 1

      // Avoid very short headlines (likely fragments)
      if (article.headline.length < 30) score -= 1

      // Avoid articles with too many numbers (likely tables/data)
      const numberCount = (article.content.match(/\d+/g) || []).length
      if (numberCount > article.content.split(/\s+/).length * 0.1) score -= 1

      return { ...article, qualityScore: score }
    })

    // Sort by quality score (highest first)
    scoredArticles.sort((a, b) => b.qualityScore - a.qualityScore)

    // Take top articles up to target count
    const filtered = scoredArticles.slice(0, targetCount)

    console.log(`✅ Quality filtering complete: kept ${filtered.length} highest quality articles`)
    console.log(`📊 Quality score range: ${filtered[filtered.length - 1]?.qualityScore} to ${filtered[0]?.qualityScore}`)

    return filtered
  }

  // Enhanced content sanitization to avoid Azure OpenAI content policy violations
  sanitizeContentForAI(text) {
    if (!text) return text

    let sanitized = text

    // Remove or replace content that commonly triggers Azure OpenAI content policies
    const sensitivePatterns = [
      // Violence and death - replace with neutral terms
      { pattern: /\b(massacre|slaughter|bloodbath|carnage|butchery)\b/gi, replacement: 'serious incident' },
      { pattern: /\b(brutal murder|savage attack|vicious assault|gruesome killing)\b/gi, replacement: 'serious incident' },
      { pattern: /\b(savage response|brutal response|violent response)\b/gi, replacement: 'strong response' },
      { pattern: /\b(killed|murdered|slain|assassinated)\b/gi, replacement: 'died' },
      { pattern: /\b(victims were killed|patients were killed|people were killed)\b/gi, replacement: 'casualties occurred' },
      { pattern: /\b(fire killed|blast killed|accident killed)\b/gi, replacement: 'fire caused casualties' },
      
      // Military and conflict terms - neutralize
      { pattern: /\b(bombing|bombardment|air strikes|missile attacks)\b/gi, replacement: 'military operations' },
      { pattern: /\b(targeted|targeting)\b/gi, replacement: 'focused on' },
      { pattern: /\b(destroy|destruction|devastate)\b/gi, replacement: 'impact' },
      
      // Political conflict terms
      { pattern: /\b(hostages|kidnapped|abducted)\b/gi, replacement: 'detained individuals' },
      { pattern: /\b(terrorist|extremist|militant)\b/gi, replacement: 'armed group member' },
      
      // Medical emergencies - use neutral language
      { pattern: /\b(died in agony|suffered terribly|screamed in pain)\b/gi, replacement: 'experienced medical emergency' },
      { pattern: /\b(burned alive|burned to death)\b/gi, replacement: 'casualties in fire incident' },
      
      // Graphic descriptions
      { pattern: /\b(blood|gore|corpse|dead body|charred remains)\b/gi, replacement: 'incident scene' },
      { pattern: /\b(horrific|gruesome|ghastly|macabre)\b/gi, replacement: 'serious' },
      
      // Sensitive topics that might trigger policies
      { pattern: /\b(suicide bomber|terrorist attack|extremist attack)\b/gi, replacement: 'security incident' },
      { pattern: /\b(hate crime|racial violence|communal violence)\b/gi, replacement: 'community incident' },
      
      // Remove excessive emotional language that might trigger sensitivity filters
      { pattern: /\b(devastating|traumatic|horrifying|terrifying)\b/gi, replacement: 'significant' },
      { pattern: /\b(nightmare|catastrophe|apocalyptic)\b/gi, replacement: 'challenging situation' }
    ]

    // Apply sanitization patterns
    sensitivePatterns.forEach(({ pattern, replacement }) => {
      sanitized = sanitized.replace(pattern, replacement)
    })

    // Remove excessive punctuation that might look like emotional outbursts
    sanitized = sanitized.replace(/[!]{2,}/g, '!')
    sanitized = sanitized.replace(/[?]{2,}/g, '?')
    
    // Clean up any remaining problematic phrases
    sanitized = sanitized
      .replace(/\b(oh my god|what the hell|damn it)\b/gi, '')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    // Truncate if extremely long to avoid token limits
    if (sanitized.length > 2500) {
      // Find a good breaking point (end of sentence)
      const truncateAt = sanitized.lastIndexOf('.', 2500)
      if (truncateAt > 2000) {
        sanitized = sanitized.substring(0, truncateAt + 1)
      } else {
        sanitized = sanitized.substring(0, 2500) + '...'
      }
    }

    return sanitized
  }

  // Enhanced nonsensical content detection
  isNonsensicalContent(headline, content) {
    const combinedText = (headline + ' ' + content).toLowerCase()
    
    // Check for extremely short or fragmented headlines that don't make sense
    const headlineWords = headline.trim().split(/\s+/)
    
    // Filter out single words or very short phrases that aren't proper headlines
    if (headlineWords.length === 1 && headlineWords[0].length < 8) {
      return true
    }
    
    // Check for nonsensical patterns
    const nonsensicalPatterns = [
      // Single words that aren't proper headlines
      /^(mr|mrs|ms|dr|prof|why|what|how|when|where|it|the|and|or|but|if|then|so|very|much|many|some|any|all|no|yes|ok|okay)\s*$/i,
      
      // Fragmented text patterns
      /^[a-z]{1,3}\s*$/i, // Single short lowercase words
      /^[A-Z]{1,3}\s*$/i, // Single short uppercase words (unless they're proper abbreviations)
      /^\w{1,2}\s+\w{1,2}\s*$/i, // Two very short words
      
      // Layout artifacts and design elements
      /^(page|pg|p)\s*\d+\s*$/i,
      /^[0-9\s\-_=+*#@$%^&()[\]{}|\\:;"'<>,.?/~`!]+$/i, // Only symbols and numbers
      /^\s*[A-Z]\s+[A-Z]\s+[A-Z]\s*$/i, // Spaced out single letters (design elements)
      
      // Common OCR errors and artifacts
      /^[il1|]{2,}$/i, // Common OCR misreads
      /^[oO0]{2,}$/i,
      /^[.,;:!?]{2,}$/i, // Only punctuation
      
      // Incomplete sentences or fragments
      /^(and|or|but|if|then|so|because|since|while|when|where|why|how|what|who|which|that)\s/i, // Starting with conjunctions/question words
      /^(the|a|an)\s+$/i, // Just articles
      
      // Navigation and UI elements
      /^(click here|read more|continue reading|next page|previous page|home|back|forward|menu|search|login|logout|subscribe|share|like|comment)\s*$/i,
      
      // Common newspaper layout elements that got extracted as headlines
      /^(advertisement|classified|obituary|weather|horoscope|crossword|sudoku|comics|sports scores|stock prices)\s*$/i,
      /^(विज्ञापन|वर्गीकृत|मौसम|राशिफल|खेल|શેર)\s*$/i, // Hindi/Gujarati equivalents
      
      // Bylines and credits that got extracted as headlines
      /^(by|author|reporter|correspondent|staff|bureau|photo|image|getty|reuters|ap|pti)\s/i,
      /^(द्वारा|संवाददाता|फोटो|छवि)\s/i, // Hindi equivalents
      /^(દ્વારા|સંવાદદાતા|ફોટો|છબી)\s/i, // Gujarati equivalents
      
      // Technical artifacts
      /^(http|www|\.com|\.in|\.org|email|@)\b/i,
      /^[0-9a-f]{8,}$/i, // Hex codes or IDs
      
      // Repeated characters (OCR artifacts)
      /(.)\1{4,}/, // Same character repeated 5+ times
      
      // Mixed language artifacts (random character combinations)
      /^[a-zA-Z]{1,3}[0-9]{1,3}[a-zA-Z]{0,3}$/i, // Mixed letters and numbers in short strings
    ]
    
    // Check headline against nonsensical patterns
    for (const pattern of nonsensicalPatterns) {
      if (pattern.test(headline.trim())) {
        console.log(`🚫 Filtered nonsensical headline: "${headline}" (matched pattern: ${pattern})`)
        return true
      }
    }
    
    // Check for headlines that are just random words without proper sentence structure
    if (headlineWords.length >= 2) {
      // Check if headline has proper sentence structure indicators
      const hasProperStructure = /\b(is|are|was|were|has|have|had|will|would|could|should|may|might|can|do|does|did|said|says|told|announced|reported|declared|launched|opened|closed|started|ended|began|finished|completed|achieved|won|lost|died|born|married|divorced|arrested|charged|convicted|sentenced|released|elected|appointed|resigned|retired|fired|hired|promoted|demoted|increased|decreased|rose|fell|dropped|gained|lost|improved|worsened|expanded|contracted|grew|shrank|developed|created|destroyed|built|demolished|bought|sold|invested|donated|contributed|helped|supported|opposed|criticized|praised|blamed|thanked|congratulated|welcomed|rejected|accepted|approved|denied|confirmed|denied|revealed|disclosed|discovered|found|lost|searched|investigated|studied|researched|tested|tried|attempted|succeeded|failed|managed|struggled|fought|battled|competed|participated|attended|visited|traveled|moved|relocated|returned|arrived|departed|left|stayed|remained|continued|stopped|paused|resumed|started|began|initiated|launched|introduced|presented|showed|displayed|exhibited|demonstrated|proved|disproved|explained|described|discussed|mentioned|noted|observed|noticed|saw|heard|felt|thought|believed|knew|understood|learned|taught|trained|educated|informed|told|asked|answered|replied|responded|questioned|wondered|doubted|trusted|hoped|wished|wanted|needed|required|demanded|requested|suggested|recommended|advised|warned|threatened|promised|agreed|disagreed|argued|debated|negotiated|compromised|decided|chose|selected|picked|preferred|liked|loved|hated|disliked|enjoyed|suffered|experienced|faced|encountered|met|joined|left|quit|resigned|retired)\b/i
      
      if (!hasProperStructure && headlineWords.length < 6) {
        // For short headlines without proper verbs, check if they at least make grammatical sense
        const commonNouns = /\b(news|report|story|article|update|announcement|government|minister|police|court|hospital|school|university|company|business|market|economy|election|vote|candidate|party|leader|president|official|citizen|people|person|man|woman|child|student|teacher|doctor|patient|fire|accident|disaster|emergency|rescue|help|support|service|building|construction|development|investment|profit|revenue|growth|increase|decrease|rise|fall|change|improvement|progress|success|failure|problem|issue|challenge|solution|result|decision|plan|project|program|policy|law|rule|regulation|health|safety|security|education|employment|technology|science|research|study|analysis|investigation|evidence|data|information|system|process|method|approach|strategy|management|organization|administration|authority|office|department|ministry|agency|institution|foundation|society|community|culture|environment|climate|weather|energy|power|transport|communication|media|television|radio|newspaper|magazine|internet|computer|mobile|phone|social|international|national|local|regional|global|public|private|personal|professional|business|commercial|industrial|medical|legal|financial|political|economic|social|cultural|educational|scientific|technological|environmental)\b/i
        
        // Check if it's at least a reasonable noun phrase
        const hasReasonableNouns = commonNouns.test(combinedText)
        if (!hasReasonableNouns && headlineWords.length < 8) {
          console.log(`🚫 Filtered headline without proper structure: "${headline}"`)
          return true
        }
      }
    }
    
    // Check content for nonsensical patterns
    const contentWords = content.toLowerCase().split(/\s+/)
    
    // If content is too short and doesn't make sense
    if (contentWords.length < 20) {
      const hasProperSentences = /[.!?]/.test(content) && content.split(/[.!?]/).length > 1
      if (!hasProperSentences) {
        console.log(`🚫 Filtered short nonsensical content: "${content.substring(0, 50)}..."`)
        return true
      }
    }
    
    // Check for excessive repetition (OCR artifacts)
    const wordFrequency = {}
    contentWords.forEach(word => {
      if (word.length > 2) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1
      }
    })
    
    const totalWords = contentWords.length
    const repeatedWords = Object.values(wordFrequency).filter(count => count > totalWords * 0.1)
    if (repeatedWords.length > 0) {
      console.log(`🚫 Filtered content with excessive repetition: "${headline}"`)
      return true
    }
    
    // Check for random character sequences
    const randomSequencePattern = /\b[a-zA-Z]{1,2}[0-9]{1,2}[a-zA-Z]{0,2}\b|\b[0-9]{1,2}[a-zA-Z]{1,2}[0-9]{0,2}\b/g
    const randomMatches = combinedText.match(randomSequencePattern) || []
    if (randomMatches.length > 3) {
      console.log(`🚫 Filtered content with random sequences: "${headline}"`)
      return true
    }
    
    return false
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
    // If one content is significantly longer, prefer it
    if (content1.length > content2.length * 2) {
      return content1
    }
    if (content2.length > content1.length * 2) {
      return content2
    }

    const sentences1 = content1.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15)
    const sentences2 = content2.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15)

    const allSentences = [...sentences1]
    let addedCount = 0

    // Add sentences from content2 that are not similar to any in content1
    sentences2.forEach(sentence2 => {
      const isUnique = !sentences1.some(sentence1 => {
        const similarity = this.calculateTextSimilarity(sentence1.toLowerCase(), sentence2.toLowerCase())
        return similarity > 0.75 // Slightly lower threshold for sentence similarity
      })

      if (isUnique) {
        allSentences.push(sentence2)
        addedCount++
      }
    })

    console.log(`🔗 Merged content: kept ${sentences1.length} sentences, added ${addedCount} unique sentences`)

    const mergedContent = allSentences.join('. ').trim()

    // If merged content is too long, prefer the longer original content
    if (mergedContent.length > 5000) {
      return content1.length > content2.length ? content1 : content2
    }

    return mergedContent
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
      if (words.length < 80) { // Increased from 50 to 80 for more substantial articles
        return false
      }

      // Check headline quality - should be proper news headline
      const headlineWords = article.headline.split(/\s+/)
      if (headlineWords.length < 4 || headlineWords.length > 20) {
        return false
      }

      // Enhanced nonsensical content detection
      if (this.isNonsensicalContent(article.headline, article.content)) {
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
        // Navigation and layout elements
        /^(report on page|editorial on page|continued on page|turn to page)/i,
        /^(getty images|reuters|ap photo|pti photo)/i,
        /^(letters to the editor|from the archive)/i,
        /^(thrilling win|purple patch|pulse check)/i, // Sports section headers
        // Repeated layout elements
        /^[A-Z\s]{10,}$/i, // All caps text (likely headers)
        /^\s*[A-Z]\s+[A-Z]\s+[A-Z]/i, // Spaced out letters (design elements)
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

    // Final deduplication pass to catch any remaining duplicates
    const finalUnique = this.finalDeduplicationPass(valid)

    // Apply dynamic quality-based filtering based on newspaper characteristics
    let result = finalUnique
    const expectedArticleCount = this.estimateExpectedArticleCount(finalUnique)
    
    if (finalUnique.length > expectedArticleCount * 1.2) { // Only filter if we have 20% more than expected
      console.log(`⚠️ Have ${finalUnique.length} articles, expected ~${expectedArticleCount}, applying quality-based filtering...`)
      result = this.applyQualityBasedFiltering(finalUnique, expectedArticleCount)
    } else {
      console.log(`✅ Article count (${finalUnique.length}) is within expected range (~${expectedArticleCount}), no additional filtering needed`)
    }

    console.log(`✅ Validated ${result.length} high-quality unique news articles`)
    console.log(`📊 Processing summary:`)
    console.log(`   - Initial extractions: ${articles.length}`)
    console.log(`   - After validation: ${valid.length}`)
    console.log(`   - After deduplication: ${finalUnique.length}`)
    console.log(`   - Final result: ${result.length}`)
    console.log(`   - Expected range: ${expectedArticleCount} ± 20%`)
    
    return result
  }

  // Analyze sentiment for all articles and generate proper headlines
  async analyzeSentimentForArticles(articles) {
    console.log(`🧠 Analyzing sentiment and generating headlines for ${articles.length} articles...`)

    const analyzed = []

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i]
      console.log(`📊 Processing article ${i + 1}/${articles.length}: "${article.headline.substring(0, 50)}..."`)

      try {
        // Generate proper headline and analyze sentiment with timeout
        const result = await Promise.race([
          this.generateHeadlineAndAnalyzeSentiment(article.headline, article.content),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Sentiment analysis timeout')), 15000) // 15 second timeout
          )
        ])

        // Skip if the article was filtered out as nonsensical
        if (result === null) {
          console.log(`🚫 Skipped nonsensical article: "${article.headline.substring(0, 50)}..."`)
          continue
        }

        // Extract insights from the article content
        const insights = this.extractArticleInsights(article.headline, article.content)
        console.log(`📊 Extracted ${insights.length} insights for article: "${article.headline.substring(0, 50)}..."`, insights)

        analyzed.push({
          ...article,
          id: `article_${i + 1}`,
          originalHeadline: article.headline, // Keep original for reference
          headline: result.generatedHeadline, // Use AI-generated headline
          headingSentiment: result.headingSentiment,
          headingSentimentReason: result.headingSentimentReason,
          headingSentimentScore: result.headingSentimentScore || 0,
          headingPercentages: result.headingPercentages || { positive: 0, negative: 0, neutral: 100 },
          contentSentiment: result.contentSentiment,
          contentSentimentReason: result.contentSentimentReason,
          contentSentimentScore: result.contentSentimentScore || 0,
          contentPercentages: result.contentPercentages || { positive: 0, negative: 0, neutral: 100 },
          overallSentiment: result.contentSentiment, // Use content sentiment as primary
          sentimentConfidence: result.confidence,
          wordCount: article.content.split(/\s+/).length,
          analysisDate: new Date(),
          analysisMethod: result.confidence === 'medium' ? 'local' : 'ai', // Track analysis method
          insights: insights // Add extracted insights
        })
        
        // Log the sentiment result
        console.log(`✅ ${result.contentSentiment}: ${result.contentSentimentReason}`)

        // Add delay to avoid rate limiting
        if (i < articles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500))
        }

      } catch (error) {
        console.error(`❌ Error processing article ${i + 1}:`, error)

        // Use local sentiment analysis as final fallback
        const localSentiment = this.analyzeLocalSentiment(article.headline, article.content)
        
        // Extract insights even in error cases
        const insights = this.extractArticleInsights(article.headline, article.content)
        
        analyzed.push({
          ...article,
          id: `article_${i + 1}`,
          originalHeadline: article.headline,
          headline: this.generateFallbackHeadline(article.content), // Generate simple fallback
          headingSentiment: localSentiment.headingSentiment,
          headingSentimentReason: localSentiment.headingSentimentReason,
          headingSentimentScore: localSentiment.headingSentimentScore || 0,
          headingPercentages: localSentiment.headingPercentages || { positive: 0, negative: 0, neutral: 100 },
          contentSentiment: localSentiment.contentSentiment,
          contentSentimentReason: localSentiment.contentSentimentReason,
          contentSentimentScore: localSentiment.contentSentimentScore || 0,
          contentPercentages: localSentiment.contentPercentages || { positive: 0, negative: 0, neutral: 100 },
          overallSentiment: localSentiment.contentSentiment,
          sentimentConfidence: 'medium', // Local analysis is better than 'low'
          wordCount: article.content.split(/\s+/).length,
          analysisDate: new Date(),
          analysisMethod: 'local-fallback',
          analysisError: error.message,
          insights: insights // Add extracted insights
        })
        
        console.log(`✅ ${localSentiment.contentSentiment} (local): ${localSentiment.contentSentimentReason}`)
      }
    }

    // Count analysis methods used
    const methodCounts = analyzed.reduce((counts, article) => {
      const method = article.analysisMethod || 'unknown'
      counts[method] = (counts[method] || 0) + 1
      return counts
    }, {})
    
    // Final filter to remove any remaining nonsensical articles
    const finalFiltered = analyzed.filter(article => {
      // Double-check for nonsensical content that might have slipped through
      if (this.isNonsensicalContent(article.headline, article.content)) {
        console.log(`🚫 Final filter removed nonsensical article: "${article.headline}"`)
        return false
      }
      
      // Filter out articles with extremely short or meaningless headlines
      const headlineWords = article.headline.trim().split(/\s+/)
      if (headlineWords.length < 3 || article.headline.length < 15) {
        console.log(`🚫 Final filter removed short headline: "${article.headline}"`)
        return false
      }
      
      return true
    })

    console.log(`✅ Sentiment analysis and headline generation completed for ${finalFiltered.length} articles (${analyzed.length - finalFiltered.length} filtered out)`)
    console.log(`📊 Analysis methods used:`, methodCounts)
    
    return finalFiltered
  }

  // Generate headline using AI and analyze sentiment
  async generateHeadlineAndAnalyzeSentiment(originalHeadline, content) {
    console.log('🤖 Generating headline and analyzing sentiment with AI...')

    // Pre-filter nonsensical content before processing
    if (this.isNonsensicalContent(originalHeadline, content)) {
      console.log(`🚫 Skipping nonsensical article: "${originalHeadline.substring(0, 50)}..."`)
      return null // Return null to indicate this article should be filtered out
    }

    // Sanitize content to avoid content policy violations
    const sanitizedContent = this.sanitizeContentForAI(content)
    const sanitizedHeadline = this.sanitizeContentForAI(originalHeadline)

    try {
      // Use the existing sentiment analysis service which has better error handling
      const sentiment = await sentimentAnalysis.analyzeSentiment(sanitizedHeadline, sanitizedContent)
      
      // Check if the sentiment analysis actually worked (not just returned defaults)
      if (sentiment.error || sentiment.headingSentimentReason.includes('Analysis failed')) {
        console.log('⚠️ AI sentiment analysis returned error, using local analysis')
        throw new Error('AI sentiment analysis failed')
      }

      // Generate a better headline from the content
      const generatedHeadline = this.generateImprovedHeadline(sanitizedHeadline, sanitizedContent)

      return {
        generatedHeadline,
        headingSentiment: sentiment.headingSentiment,
        headingSentimentReason: sentiment.headingSentimentReason,
        headingSentimentScore: sentiment.headingSentimentScore || 0,
        headingPercentages: sentiment.headingPercentages || { positive: 0, negative: 0, neutral: 100 },
        contentSentiment: sentiment.contentSentiment,
        contentSentimentReason: sentiment.contentSentimentReason,
        contentSentimentScore: sentiment.contentSentimentScore || 0,
        contentPercentages: sentiment.contentPercentages || { positive: 0, negative: 0, neutral: 100 },
        confidence: sentiment.confidence
      }

    } catch (error) {
      console.error('❌ Error in AI headline generation:', error)

      // Use local sentiment analysis as fallback
      const localSentiment = this.analyzeLocalSentiment(sanitizedHeadline, sanitizedContent)
      
      return {
        generatedHeadline: this.generateFallbackHeadline(sanitizedContent),
        headingSentiment: localSentiment.headingSentiment,
        headingSentimentReason: localSentiment.headingSentimentReason,
        headingSentimentScore: localSentiment.headingSentimentScore || 0,
        headingPercentages: localSentiment.headingPercentages || { positive: 0, negative: 0, neutral: 100 },
        contentSentiment: localSentiment.contentSentiment,
        contentSentimentReason: localSentiment.contentSentimentReason,
        contentSentimentScore: localSentiment.contentSentimentScore || 0,
        contentPercentages: localSentiment.contentPercentages || { positive: 0, negative: 0, neutral: 100 },
        confidence: 'medium' // Better than 'low' since we're doing actual analysis
      }
    }
  }

  // Local sentiment analysis fallback (works without external APIs)
  analyzeLocalSentiment(headline, content) {
    console.log('🔄 Using local sentiment analysis fallback...')
    
    const text = (headline + ' ' + content).toLowerCase()
    
    // Define multilingual sentiment word lists
    const positiveWords = [
      // English
      'success', 'achievement', 'victory', 'win', 'progress', 'growth', 'improvement', 'benefit',
      'positive', 'good', 'great', 'excellent', 'outstanding', 'remarkable', 'breakthrough',
      'launch', 'inaugurate', 'celebrate', 'honor', 'award', 'recognize', 'approve', 'support',
      'increase', 'rise', 'boost', 'enhance', 'strengthen', 'expand', 'develop', 'advance',
      'relief', 'help', 'assist', 'aid', 'rescue', 'save', 'protect', 'secure', 'peace',
      'agreement', 'cooperation', 'partnership', 'alliance', 'unity', 'harmony', 'stability',
      // Hindi
      'सफलता', 'जीत', 'विजय', 'प्रगति', 'विकास', 'सुधार', 'लाभ', 'अच्छा', 'बेहतर', 'उत्कृष्ट',
      'शुभारंभ', 'उद्घाटन', 'सम्मान', 'पुरस्कार', 'मान्यता', 'समर्थन', 'वृद्धि', 'बढ़ोतरी',
      'सहायता', 'मदद', 'राहत', 'बचाव', 'सुरक्षा', 'शांति', 'समझौता', 'सहयोग', 'एकता',
      // Gujarati
      'સફળતા', 'જીત', 'વિજય', 'પ્રગતિ', 'વિકાસ', 'સુધારો', 'લાભ', 'સારું', 'બેહતર', 'ઉત્કૃષ્ટ',
      'શુભારંભ', 'ઉદ્ઘાટન', 'સન્માન', 'પુરસ્કાર', 'માન્યતા', 'સમર્થન', 'વૃદ્ધિ', 'વધારો',
      'સહાય', 'મદદ', 'રાહત', 'બચાવ', 'સુરક્ષા', 'શાંતિ', 'કરાર', 'સહયોગ', 'એકતા'
    ]
    
    const negativeWords = [
      // English
      'crisis', 'problem', 'issue', 'concern', 'worry', 'fear', 'threat', 'danger', 'risk',
      'failure', 'loss', 'defeat', 'decline', 'fall', 'drop', 'crash', 'collapse', 'disaster',
      'incident', 'accident', 'emergency', 'urgent', 'critical', 'serious', 'severe', 'major',
      'conflict', 'dispute', 'tension', 'opposition', 'protest', 'strike', 'boycott', 'ban',
      'reject', 'deny', 'refuse', 'oppose', 'criticize', 'condemn', 'blame', 'accuse',
      'corruption', 'scandal', 'controversy', 'investigation', 'arrest', 'charge', 'penalty',
      'damage', 'harm', 'hurt', 'injury', 'death', 'violence', 'war', 'attack', 'fight',
      // Hindi
      'संकट', 'समस्या', 'चिंता', 'डर', 'खतरा', 'जोखिम', 'असफलता', 'हार', 'नुकसान', 'गिरावट',
      'दुर्घटना', 'आपातकाल', 'गंभीर', 'विवाद', 'संघर्ष', 'तनाव', 'विरोध', 'प्रदर्शन', 'हड़ताल',
      'भ्रष्टाचार', 'घोटाला', 'विवाद', 'जांच', 'गिरफ्तारी', 'आरोप', 'दंड', 'नुकसान', 'हिंसा',
      // Gujarati
      'સંકટ', 'સમસ્યા', 'ચિંતા', 'ડર', 'ખતરો', 'જોખમ', 'અસફળતા', 'હાર', 'નુકસાન', 'ઘટાડો',
      'અકસ્માત', 'કટોકટી', 'ગંભીર', 'વિવાદ', 'સંઘર્ષ', 'તણાવ', 'વિરોધ', 'પ્રદર્શન', 'હડતાળ',
      'ભ્રષ્ટાચાર', 'ઘોટાળો', 'વિવાદ', 'તપાસ', 'ધરપકડ', 'આરોપ', 'દંડ', 'નુકસાન', 'હિંસા'
    ]
    
    const neutralWords = [
      // English
      'announce', 'report', 'state', 'declare', 'confirm', 'reveal', 'disclose', 'publish',
      'meeting', 'conference', 'discussion', 'session', 'committee', 'board', 'council',
      'policy', 'plan', 'strategy', 'program', 'project', 'initiative', 'scheme', 'proposal',
      'budget', 'finance', 'economy', 'market', 'business', 'industry', 'sector', 'company',
      'government', 'minister', 'official', 'authority', 'department', 'agency', 'office',
      'election', 'vote', 'campaign', 'candidate', 'party', 'political', 'parliament',
      // Hindi
      'घोषणा', 'रिपोर्ट', 'बयान', 'पुष्टि', 'बैठक', 'सम्मेलन', 'चर्चा', 'समिति', 'परिषद',
      'नीति', 'योजना', 'रणनीति', 'कार्यक्रम', 'परियोजना', 'बजट', 'वित्त', 'अर्थव्यवस्था',
      'सरकार', 'मंत्री', 'अधिकारी', 'प्राधिकरण', 'विभाग', 'चुनाव', 'मतदान', 'अभियान',
      // Gujarati
      'જાહેરાત', 'રિપોર્ટ', 'નિવેદન', 'પુષ્ટિ', 'બેઠક', 'પરિષદ', 'ચર્ચા', 'સમિતિ', 'પરિષદ',
      'નીતિ', 'યોજના', 'વ્યૂહરચના', 'કાર્યક્રમ', 'પ્રોજેક્ટ', 'બજેટ', 'નાણાં', 'અર્થતંત્ર',
      'સરકાર', 'મંત્રી', 'અધિકારી', 'સત્તાધિકારી', 'વિભાગ', 'ચૂંટણી', 'મતદાન', 'અભિયાન'
    ]
    
    // Count sentiment words
    let positiveCount = 0
    let negativeCount = 0
    let neutralCount = 0
    
    positiveWords.forEach(word => {
      const matches = (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length
      positiveCount += matches
    })
    
    negativeWords.forEach(word => {
      const matches = (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length
      negativeCount += matches
    })
    
    neutralWords.forEach(word => {
      const matches = (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length
      neutralCount += matches
    })
    
    // Determine sentiment based on word counts with enhanced scoring
    const total = positiveCount + negativeCount + neutralCount
    
    let headingSentiment, contentSentiment, headingReason, contentReason
    let headingSentimentScore = 0, contentSentimentScore = 0
    let headingPercentages, contentPercentages
    
    if (total === 0) {
      // No sentiment indicators found
      headingSentiment = contentSentiment = 'Neutral'
      headingReason = contentReason = 'No clear sentiment indicators found in the text'
      headingSentimentScore = contentSentimentScore = 0
      headingPercentages = contentPercentages = { positive: 0, negative: 0, neutral: 100 }
    } else {
      // Calculate percentages
      const positivePercent = Math.round((positiveCount / total) * 100)
      const negativePercent = Math.round((negativeCount / total) * 100)
      const neutralPercent = Math.max(0, 100 - positivePercent - negativePercent)
      
      headingPercentages = contentPercentages = {
        positive: positivePercent,
        negative: negativePercent,
        neutral: neutralPercent
      }
      
      // Calculate sentiment score (-10 to +10)
      const rawScore = positiveCount - negativeCount
      const maxScore = Math.max(positiveCount + negativeCount, 1)
      const normalizedScore = (rawScore / maxScore) * 10
      headingSentimentScore = contentSentimentScore = Math.round(normalizedScore * 100) / 100
      
      // Determine sentiment (require at least 40% for positive/negative, otherwise neutral)
      if (positivePercent >= 40 && positivePercent > negativePercent) {
        headingSentiment = contentSentiment = 'Positive'
        headingReason = contentReason = `Contains positive indicators (${positiveCount} positive words, ${positivePercent}% positive, score: ${headingSentimentScore})`
      } else if (negativePercent >= 40 && negativePercent > positivePercent) {
        headingSentiment = contentSentiment = 'Negative'
        headingReason = contentReason = `Contains negative indicators (${negativeCount} negative words, ${negativePercent}% negative, score: ${headingSentimentScore})`
      } else {
        headingSentiment = contentSentiment = 'Neutral'
        if (neutralPercent > 50) {
          headingReason = contentReason = `Primarily neutral/factual content (${neutralCount} neutral indicators, ${neutralPercent}% neutral, score: ${headingSentimentScore})`
        } else {
          headingReason = contentReason = `Mixed sentiment indicators (${positivePercent}% positive, ${negativePercent}% negative, score: ${headingSentimentScore})`
        }
      }
    }
    
    console.log(`📊 Local sentiment: ${contentSentiment} (pos:${positiveCount}, neg:${negativeCount}, neu:${neutralCount}, score:${contentSentimentScore})`)
    
    return {
      headingSentiment,
      headingSentimentReason: headingReason,
      headingSentimentScore,
      headingPercentages,
      contentSentiment,
      contentSentimentReason: contentReason,
      contentSentimentScore,
      contentPercentages
    }
  }

  // Generate an improved headline from original and content
  generateImprovedHeadline(originalHeadline, content) {
    // If original headline is good quality, use it
    const originalWords = originalHeadline.split(/\s+/)
    if (originalWords.length >= 5 && originalWords.length <= 15 && originalHeadline.length >= 30) {
      return originalHeadline
    }

    // Otherwise, generate from content
    return this.generateFallbackHeadline(content)
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
      .sort(([, a], [, b]) => b - a)[0]

    const overallSentiment = maxSentiment[1] > 0 ? maxSentiment[0] : 'neutral'



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

  // Extract detailed insights from individual article content
  extractArticleInsights(headline, content) {
    console.log('🔍 Extracting detailed insights from article...')
    console.log(`📝 Article: "${headline.substring(0, 100)}..."`)
    
    const fullText = (headline + ' ' + content).toLowerCase()
    const originalText = headline + ' ' + content
    const insights = []

    try {
      // 1. Political and Election Insights
      const politicalInsights = this.extractPoliticalInsights(fullText, originalText)
      insights.push(...politicalInsights)

      // 2. Economic and Financial Insights
      const economicInsights = this.extractEconomicInsights(fullText, originalText)
      insights.push(...economicInsights)

      // 3. Social and Demographic Insights
      const socialInsights = this.extractSocialInsights(fullText, originalText)
      insights.push(...socialInsights)

      // 4. Health and Medical Insights
      const healthInsights = this.extractHealthInsights(fullText, originalText)
      insights.push(...healthInsights)

      // 5. Technology and Innovation Insights
      const techInsights = this.extractTechnologyInsights(fullText, originalText)
      insights.push(...techInsights)

      // 6. Environmental and Climate Insights
      const environmentalInsights = this.extractEnvironmentalInsights(fullText, originalText)
      insights.push(...environmentalInsights)

      // 7. Sports and Entertainment Insights
      const sportsInsights = this.extractSportsInsights(fullText, originalText)
      insights.push(...sportsInsights)

      // 8. Education and Academic Insights
      const educationInsights = this.extractEducationInsights(fullText, originalText)
      insights.push(...educationInsights)

      // 9. Business and Corporate Insights
      const businessInsights = this.extractBusinessInsights(fullText, originalText)
      insights.push(...businessInsights)

      // 10. Infrastructure and Development Insights
      const infrastructureInsights = this.extractInfrastructureInsights(fullText, originalText)
      insights.push(...infrastructureInsights)

      // 11. Legal and Judicial Insights
      const legalInsights = this.extractLegalInsights(fullText, originalText)
      insights.push(...legalInsights)

      // 12. General Statistical Insights (catch-all for any missed data)
      const statisticalInsights = this.extractStatisticalInsights(fullText, originalText)
      insights.push(...statisticalInsights)

      console.log(`🔍 Total insights extracted: ${insights.length}`)
      
      // If no specific insights found, generate article summary
      if (insights.length === 0) {
        const summary = this.generateArticleSummary(headline, content)
        return [summary]
      }

      // Remove duplicates with better deduplication logic
      const uniqueInsights = this.deduplicateInsights(insights)
      
      // Sort insights by importance (political, economic, health first)
      const sortedInsights = this.sortInsightsByImportance(uniqueInsights)
      
      return sortedInsights

    } catch (error) {
      console.error('❌ Error extracting insights:', error)
      // Fallback to article summary
      const summary = this.generateArticleSummary(headline, content)
      return [summary]
    }
  }

  // Extract political and election insights with enhanced language
  extractPoliticalInsights(text, originalText) {
    const insights = []
    
    // Enhanced political party support and survey data
    const partyPatterns = [
      // English patterns for party support with better context
      /(bjp|bharatiya janata party|congress|indian national congress|aap|aam aadmi party|sp|samajwadi party|bsp|bahujan samaj party|tmc|trinamool congress|dmk|aiadmk|jdu|janata dal|rjd|rashtriya janata dal|shiv sena|ncp|nationalist congress party|left front|cpi|communist party).*?(?:leads?|leading|ahead|support|backing|favor|preference|enjoys).*?(\d+(?:\.\d+)?)\s*(?:%|percent|percentage)/gi,
      /(\d+(?:\.\d+)?)\s*(?:%|percent|percentage).*?(?:support|favor|back|prefer|vote|choose|backing).*?(bjp|bharatiya janata party|congress|indian national congress|aap|aam aadmi party|sp|samajwadi party|bsp|bahujan samaj party|tmc|trinamool congress|dmk|aiadmk|jdu|janata dal|rjd|rashtriya janata dal|shiv sena|ncp|nationalist congress party|left front|cpi|communist party)/gi,
      /(?:survey|poll|opinion poll|exit poll|pre-poll survey).*?(bjp|bharatiya janata party|congress|indian national congress|aap|aam aadmi party|sp|samajwadi party|bsp|bahujan samaj party|tmc|trinamool congress|dmk|aiadmk|jdu|janata dal|rjd|rashtriya janata dal|shiv sena|ncp|nationalist congress party|left front|cpi|communist party).*?(\d+(?:\.\d+)?)\s*(?:%|percent)/gi,
      
      // Hindi patterns with better context
      /(भाजपा|कांग्रेस|आम आदमी पार्टी|समाजवादी पार्टी|बसपा|तृणमूल कांग्रेस|द्रमुक|अन्नाद्रमुक|जदयू|राजद|शिवसेना|राकांपा).*?(?:समर्थन|वोट|पसंद).*?(\d+(?:\.\d+)?)\s*(?:%|प्रतिशत|फीसदी)/gi,
      /(\d+(?:\.\d+)?)\s*(?:%|प्रतिशत|फीसदी).*?(?:समर्थन|वोट|पसंद).*?(भाजपा|कांग्रेस|आम आदमी पार्टी|समाजवादी पार्टी|बसपा|तृणमूल कांग्रेस|द्रमुक|अन्नाद्रमुक|जदयू|राजद|शिवसेना|राकांपा)/gi,
      
      // Gujarati patterns with better context
      /(ભાજપ|કોંગ્રેસ|આમ આદમી પાર્ટી).*?(?:સમર્થન|મત).*?(\d+(?:\.\d+)?)\s*(?:%|ટકા)/gi,
      /(\d+(?:\.\d+)?)\s*(?:%|ટકા).*?(?:સમર્થન|મત).*?(ભાજપ|કોંગ્રેસ|આમ આદમી પાર્ટી)/gi
    ]

    partyPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const party = (match[1] && isNaN(parseFloat(match[1]))) ? match[1] : match[2]
        const percentage = (match[1] && !isNaN(parseFloat(match[1]))) ? match[1] : match[2]
        
        if (party && percentage && !isNaN(parseFloat(percentage))) {
          const partyName = this.normalizePartyName(party.trim())
          const percentValue = parseFloat(percentage)
          
          if (percentValue > 50) {
            insights.push(`🗳️ ${partyName} commands strong public support with ${percentage}% voter preference, indicating a dominant position in the political landscape`)
          } else if (percentValue > 30) {
            insights.push(`🗳️ ${partyName} maintains significant voter support at ${percentage}%, positioning itself as a major political contender`)
          } else {
            insights.push(`🗳️ ${partyName} holds ${percentage}% voter support according to recent polling data`)
          }
        }
      }
    })

    // Enhanced voter turnout data with context
    const turnoutPatterns = [
      /(?:voter turnout|voting percentage|turnout|participation).*?(\d+(?:\.\d+)?)\s*(?:%|percent)/gi,
      /(\d+(?:\.\d+)?)\s*(?:%|percent).*?(?:voter turnout|voting|participated|cast.*votes)/gi,
      /(?:मतदान प्रतिशत|वोटिंग|मतदान).*?(\d+(?:\.\d+)?)\s*(?:%|प्रतिशत|फीसदी)/gi,
      /(?:મતદાન ટકાવારી|વોટિંગ|મતદાન).*?(\d+(?:\.\d+)?)\s*(?:%|ટકા)/gi
    ]

    turnoutPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const percentage = parseFloat(match[1])
        if (percentage && !isNaN(percentage)) {
          if (percentage > 70) {
            insights.push(`📊 Exceptional democratic participation recorded with ${percentage}% voter turnout, reflecting high civic engagement`)
          } else if (percentage > 60) {
            insights.push(`📊 Strong voter participation observed with ${percentage}% turnout, indicating active democratic involvement`)
          } else if (percentage > 50) {
            insights.push(`📊 Moderate voter turnout of ${percentage}% recorded in the electoral process`)
          } else {
            insights.push(`📊 Voter turnout stood at ${percentage}%, suggesting room for improved civic participation`)
          }
        }
      }
    })

    // Enhanced seat/constituency data with better language
    const seatPatterns = [
      /(bjp|congress|aap|sp|bsp|tmc|dmk|aiadmk|jdu|rjd|shiv sena|ncp).*?(?:won|wins|secured|gained|captured).*?(\d+)\s*(?:seats?|constituencies)/gi,
      /(\d+)\s*(?:seats?|constituencies).*?(?:won|secured|gained|captured).*?(bjp|congress|aap|sp|bsp|tmc|dmk|aiadmk|jdu|rjd|shiv sena|ncp)/gi,
      /(?:भाजपा|कांग्रेस|आप|सपा|बसपा).*?(\d+).*?(?:सीट|सीटें|क्षेत्र)/gi,
      /(\d+).*?(?:सीट|सीटें|क्षेत्र).*?(?:भाजपा|कांग्रेस|आप|सपा|बसपा)/gi
    ]

    seatPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const party = (match[1] && isNaN(parseInt(match[1]))) ? match[1] : match[2]
        const seats = (match[1] && !isNaN(parseInt(match[1]))) ? match[1] : match[2]
        
        if (party && seats && !isNaN(parseInt(seats))) {
          const partyName = this.normalizePartyName(party.trim())
          const seatCount = parseInt(seats)
          
          if (seatCount > 100) {
            insights.push(`🏆 ${partyName} achieved a decisive electoral victory by securing ${seats} constituencies, establishing clear mandate`)
          } else if (seatCount > 50) {
            insights.push(`🏆 ${partyName} demonstrated strong electoral performance by winning ${seats} seats across constituencies`)
          } else if (seatCount > 10) {
            insights.push(`🏆 ${partyName} secured ${seats} constituencies in the electoral contest`)
          } else {
            insights.push(`🏆 ${partyName} won ${seats} seats in the election`)
          }
        }
      }
    })

    // Political alliance and coalition insights
    const alliancePatterns = [
      /(?:alliance|coalition|front).*?(?:formed|announced|declared).*?(\d+)\s*(?:parties|members)/gi,
      /(\d+)\s*(?:parties|members).*?(?:alliance|coalition|front)/gi
    ]

    alliancePatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const count = match[1]
        if (count && !isNaN(parseInt(count))) {
          insights.push(`🤝 Political alliance formation involves ${count} parties, indicating strategic coalition building for electoral advantage`)
        }
      }
    })

    return insights
  }

  // Extract economic and financial insights with enhanced language
  extractEconomicInsights(text, originalText) {
    const insights = []

    // Enhanced GDP, inflation, growth rates with better context
    const economicPatterns = [
      /(?:gdp|gross domestic product).*?(?:growth|increased?|decreased?|declined?|expanded?|contracted?).*?(\d+(?:\.\d+)?)\s*(?:%|percent)/gi,
      /(?:inflation|price rise|consumer price index|cpi|महंगाई|મોંઘવારી).*?(\d+(?:\.\d+)?)\s*(?:%|percent|प्रतिशत|ટકા)/gi,
      /(?:unemployment|jobless|joblessness|बेरोजगारी|બેરોજગારી).*?(?:rate|level).*?(\d+(?:\.\d+)?)\s*(?:%|percent|प्रतिशत|ટકા)/gi,
      /(?:budget|allocation|spending|expenditure|outlay|बजट|બજેટ).*?(?:₹|rs\.?|rupees?|crore|lakh|billion|million|करोड़|લાખ|કરોડ)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|billion|million|करोड़|લાખ|કરોડ)/gi,
      /(?:revenue|income|profit|loss|earnings|turnover|आय|નફો).*?(?:₹|rs\.?|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|billion|million|करोड़|લાખ|કરોડ)/gi,
      /(?:fiscal deficit|current account deficit|trade deficit).*?(\d+(?:\.\d+)?)\s*(?:%|percent)/gi,
      /(?:interest rate|repo rate|bank rate).*?(\d+(?:\.\d+)?)\s*(?:%|percent)/gi
    ]

    economicPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const value = match[1]
        const numValue = parseFloat(value.replace(/,/g, ''))
        if (value && !isNaN(numValue)) {
          const context = match[0].toLowerCase()
          
          if (context.includes('gdp')) {
            if (numValue > 7) {
              insights.push(`📈 Robust economic expansion recorded with GDP growth rate of ${value}%, indicating strong economic momentum`)
            } else if (numValue > 5) {
              insights.push(`📈 Healthy economic growth observed at ${value}% GDP expansion, reflecting positive economic trends`)
            } else if (numValue > 0) {
              insights.push(`📈 Moderate economic growth of ${value}% GDP recorded, showing steady economic progress`)
            } else {
              insights.push(`📉 Economic contraction noted with GDP declining by ${Math.abs(numValue)}%, signaling economic challenges`)
            }
          } else if (context.includes('inflation')) {
            if (numValue > 6) {
              insights.push(`💰 High inflation rate of ${value}% recorded, indicating significant price pressures in the economy`)
            } else if (numValue > 4) {
              insights.push(`💰 Moderate inflation at ${value}% observed, reflecting controlled price rise trends`)
            } else if (numValue > 2) {
              insights.push(`💰 Inflation rate stands at ${value}%, within manageable economic parameters`)
            } else {
              insights.push(`💰 Low inflation of ${value}% recorded, indicating price stability in the market`)
            }
          } else if (context.includes('unemployment')) {
            if (numValue > 8) {
              insights.push(`👥 High unemployment rate of ${value}% highlights significant job market challenges requiring policy intervention`)
            } else if (numValue > 5) {
              insights.push(`👥 Unemployment rate at ${value}% indicates moderate job market stress`)
            } else {
              insights.push(`👥 Unemployment rate of ${value}% reflects relatively stable job market conditions`)
            }
          } else if (context.includes('budget') || context.includes('allocation') || context.includes('spending')) {
            const croreValue = numValue
            if (croreValue > 10000) {
              insights.push(`💼 Massive budget allocation of ₹${value} crore announced, representing significant government investment`)
            } else if (croreValue > 1000) {
              insights.push(`💼 Substantial budget provision of ₹${value} crore allocated for development initiatives`)
            } else {
              insights.push(`💼 Budget allocation of ₹${value} crore designated for specific programs`)
            }
          } else if (context.includes('revenue') || context.includes('profit') || context.includes('income')) {
            insights.push(`💵 Financial performance shows ₹${value} crore in revenue generation, indicating business activity`)
          } else if (context.includes('deficit')) {
            insights.push(`📊 Fiscal deficit stands at ${value}%, reflecting government's financial position`)
          } else if (context.includes('interest rate') || context.includes('repo rate')) {
            insights.push(`🏦 Monetary policy adjustment with interest rate at ${value}%, impacting borrowing costs`)
          }
        }
      }
    })

    // Enhanced stock market data with better context
    const stockPatterns = [
      /(?:sensex|nifty|bse|nse).*?(?:up|down|gained?|lost|fell|rose|surged?|plunged?).*?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:points?)/gi,
      /(?:stock|share|equity).*?(?:price|value|trading).*?(?:₹|rs\.?|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/gi,
      /(?:market cap|market capitalization|valuation).*?(?:₹|rs\.?|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|billion|million)/gi,
      /(?:ipo|initial public offering).*?(?:₹|rs\.?|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|billion|million)/gi
    ]

    stockPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const value = match[1]
        const numValue = parseFloat(value.replace(/,/g, ''))
        if (value && !isNaN(numValue)) {
          const context = match[0].toLowerCase()
          
          if (context.includes('sensex') || context.includes('nifty')) {
            if (context.includes('up') || context.includes('gained') || context.includes('rose') || context.includes('surged')) {
              insights.push(`📊 Stock market shows positive momentum with ${numValue.toLocaleString()} points gain, reflecting investor confidence`)
            } else if (context.includes('down') || context.includes('lost') || context.includes('fell') || context.includes('plunged')) {
              insights.push(`📊 Stock market experiences decline with ${numValue.toLocaleString()} points drop, indicating market volatility`)
            } else {
              insights.push(`📊 Stock market movement of ${numValue.toLocaleString()} points recorded in trading session`)
            }
          } else if (context.includes('market cap') || context.includes('valuation')) {
            insights.push(`🏢 Corporate valuation reaches ₹${value} crore, highlighting significant market presence`)
          } else if (context.includes('ipo')) {
            insights.push(`🚀 IPO launch valued at ₹${value} crore, indicating new investment opportunity in capital markets`)
          } else {
            insights.push(`💹 Stock trading activity shows ₹${value} value, reflecting market dynamics`)
          }
        }
      }
    })

    return insights
  }

  // Extract social and demographic insights with enhanced language
  extractSocialInsights(text, originalText) {
    const insights = []

    // Enhanced population and demographic data
    const demographicPatterns = [
      /(?:population|people|citizens|residents|जनसंख्या|વસ્તી).*?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|million|billion|thousand|करोड़|લાખ|કરોડ)/gi,
      /(\d+(?:\.\d+)?)\s*(?:%|percent|प्रतिशत|ટકા).*?(?:women|female|men|male|children|youth|elderly|senior citizens|महिला|પુરુષ|મહિલા)/gi,
      /(?:literacy rate|education|educational attainment|साक्षरता|શિક્ષણ).*?(\d+(?:\.\d+)?)\s*(?:%|percent|प्रतिशत|ટકા)/gi,
      /(?:poverty|below poverty line|bpl|गरीबी|ગરીબી).*?(\d+(?:\.\d+)?)\s*(?:%|percent|प्रतिशत|ટકા)/gi,
      /(?:birth rate|death rate|mortality rate).*?(\d+(?:\.\d+)?)\s*(?:per|\/)/gi,
      /(?:life expectancy|average age).*?(\d+(?:\.\d+)?)\s*(?:years?)/gi
    ]

    demographicPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const value = match[1]
        const numValue = parseFloat(value.replace(/,/g, ''))
        if (value && !isNaN(numValue)) {
          const context = match[0].toLowerCase()
          
          if (context.includes('population') || context.includes('people') || context.includes('citizens')) {
            if (numValue >= 1) {
              insights.push(`👥 Significant population data shows ${value} crore people affected, highlighting demographic scale`)
            } else {
              insights.push(`👥 Population statistics indicate ${value} lakh residents, showing community size`)
            }
          } else if (context.includes('literacy') || context.includes('education')) {
            if (numValue > 90) {
              insights.push(`📚 Exceptional literacy achievement with ${value}% rate, demonstrating educational excellence`)
            } else if (numValue > 75) {
              insights.push(`📚 Strong educational progress shown by ${value}% literacy rate, indicating good learning outcomes`)
            } else if (numValue > 50) {
              insights.push(`📚 Moderate literacy rate of ${value}% recorded, showing room for educational improvement`)
            } else {
              insights.push(`📚 Literacy rate at ${value}% highlights need for enhanced educational initiatives`)
            }
          } else if (context.includes('poverty') || context.includes('bpl')) {
            if (numValue > 30) {
              insights.push(`💔 High poverty rate of ${value}% indicates significant socio-economic challenges requiring intervention`)
            } else if (numValue > 15) {
              insights.push(`💔 Moderate poverty level at ${value}% shows ongoing socio-economic development needs`)
            } else {
              insights.push(`💔 Poverty rate of ${value}% reflects improving socio-economic conditions`)
            }
          } else if (context.includes('women') || context.includes('female')) {
            insights.push(`👩 Gender demographics show ${value}% female representation, indicating social composition`)
          } else if (context.includes('children') || context.includes('youth')) {
            insights.push(`👶 Youth demographics indicate ${value}% young population, showing age distribution patterns`)
          } else if (context.includes('life expectancy')) {
            insights.push(`⏰ Life expectancy data shows ${value} years average, reflecting health and living standards`)
          } else {
            insights.push(`📊 Demographic indicator shows ${value}% distribution, providing social insights`)
          }
        }
      }
    })

    return insights
  }

  // Extract health and medical insights with enhanced language
  extractHealthInsights(text, originalText) {
    const insights = []

    // Enhanced health statistics and medical data
    const healthPatterns = [
      /(?:covid|coronavirus|pandemic|कोविड|કોવિડ).*?(?:cases|patients|infected|positive|मामले|કેસ).*?(\d+(?:,\d+)*)/gi,
      /(?:vaccination|immunization|vaccine|टीकाकरण|રસીકરણ).*?(\d+(?:\.\d+)?)\s*(?:%|percent|प्रतिशत|ટકા)/gi,
      /(?:mortality|death|fatality|मृत्यु|મૃત્યુ).*?rate.*?(\d+(?:\.\d+)?)\s*(?:%|percent|per|\/|प्रतिशत|ટકા)/gi,
      /(?:recovery rate|survival rate|cure rate|ठीक होने की दर|સાજા થવાનો દર).*?(\d+(?:\.\d+)?)\s*(?:%|percent|प्रतिशत|ટકા)/gi,
      /(?:hospital|medical facility|health center|अस्पताल|હોસ્પિટલ).*?(?:beds|capacity).*?(\d+(?:,\d+)*)/gi,
      /(?:doctors|physicians|medical staff|डॉक्टर|ડૉક્ટર).*?(\d+(?:,\d+)*)/gi,
      /(?:disease|illness|epidemic|बीमारी|રોગ).*?(\d+(?:,\d+)*)\s*(?:cases|patients)/gi
    ]

    healthPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const value = match[1]
        const numValue = parseFloat(value.replace(/,/g, ''))
        if (value && !isNaN(numValue)) {
          const context = match[0].toLowerCase()
          
          if (context.includes('covid') || context.includes('coronavirus') || context.includes('pandemic')) {
            if (numValue > 10000) {
              insights.push(`🦠 Significant COVID-19 impact with ${value} cases reported, indicating major health challenge`)
            } else if (numValue > 1000) {
              insights.push(`🦠 Moderate COVID-19 cases at ${value}, showing ongoing health monitoring needs`)
            } else {
              insights.push(`🦠 COVID-19 cases reported at ${value}, reflecting current health status`)
            }
          } else if (context.includes('vaccination') || context.includes('immunization')) {
            if (numValue > 80) {
              insights.push(`💉 Excellent vaccination coverage achieved at ${value}%, demonstrating strong public health response`)
            } else if (numValue > 60) {
              insights.push(`💉 Good vaccination progress with ${value}% coverage, showing effective immunization drive`)
            } else if (numValue > 40) {
              insights.push(`💉 Moderate vaccination rate of ${value}% recorded, indicating ongoing immunization efforts`)
            } else {
              insights.push(`💉 Vaccination coverage at ${value}%, highlighting need for enhanced immunization programs`)
            }
          } else if (context.includes('mortality') || context.includes('death') || context.includes('fatality')) {
            if (numValue > 5) {
              insights.push(`⚕️ High mortality rate of ${value}% indicates serious health concerns requiring immediate attention`)
            } else if (numValue > 2) {
              insights.push(`⚕️ Moderate mortality rate at ${value}%, showing manageable health outcomes`)
            } else {
              insights.push(`⚕️ Low mortality rate of ${value}% reflects positive health management`)
            }
          } else if (context.includes('recovery') || context.includes('survival')) {
            if (numValue > 90) {
              insights.push(`🏥 Excellent recovery rate of ${value}% demonstrates effective medical treatment and care`)
            } else if (numValue > 75) {
              insights.push(`🏥 Good recovery rate at ${value}%, showing positive medical outcomes`)
            } else {
              insights.push(`🏥 Recovery rate of ${value}% indicates ongoing medical care improvements needed`)
            }
          } else if (context.includes('hospital') || context.includes('beds')) {
            insights.push(`🏥 Healthcare infrastructure shows ${value} bed capacity, indicating medical facility readiness`)
          } else if (context.includes('doctors') || context.includes('medical staff')) {
            insights.push(`👨‍⚕️ Medical workforce comprises ${value} healthcare professionals, showing human resource availability`)
          } else {
            insights.push(`🩺 Health statistics show ${value} cases, providing medical insights`)
          }
        }
      }
    })

    return insights
  }

  // Extract technology insights with enhanced language
  extractTechnologyInsights(text, originalText) {
    const insights = []

    // Enhanced technology adoption and digital metrics
    const techPatterns = [
      /(?:internet|digital|online|cyber|इंटरनेट|ઇન્ટરનેટ).*?(?:users?|adoption|penetration|connectivity|उपयोगकर्ता|વપરાશકર્તા).*?(\d+(?:\.\d+)?)\s*(?:%|percent|million|crore|प्रतिशत|ટકા|करोड़|કરોડ)/gi,
      /(?:smartphone|mobile|tablet|device|स्मार्टफोन|સ્માર્ટફોન).*?(?:users?|penetration|sales|उपयोगकर्ता|વપરાશકર્તા).*?(\d+(?:\.\d+)?)\s*(?:%|percent|million|crore|प्रतिशत|ટકા|करोड़|કરોડ)/gi,
      /(?:5g|4g|3g|broadband|fiber|wifi|ब्रॉडबैंड|બ્રોડબેન્ડ).*?(?:speed|connectivity).*?(\d+(?:\.\d+)?)\s*(?:mbps|gbps|gb|mb|tb)/gi,
      /(?:app|application|software|platform).*?(?:downloads|installs|users|डाउनलोड|ડાઉનલોડ).*?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:million|crore|lakh|thousand|करोड़|લાખ|કરોડ)/gi,
      /(?:ai|artificial intelligence|machine learning|automation).*?(?:implementation|adoption|investment).*?(?:₹|rs\.?|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|billion|million)/gi,
      /(?:startup|tech company|innovation).*?(?:funding|investment|valuation).*?(?:₹|rs\.?|\$|dollars?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|billion|million)/gi
    ]

    techPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const value = match[1]
        const numValue = parseFloat(value.replace(/,/g, ''))
        if (value && !isNaN(numValue)) {
          const context = match[0].toLowerCase()
          
          if (context.includes('internet') || context.includes('digital') || context.includes('online')) {
            if (numValue > 80) {
              insights.push(`🌐 Exceptional digital penetration with ${value}% internet adoption, indicating advanced digital society`)
            } else if (numValue > 60) {
              insights.push(`🌐 Strong digital connectivity at ${value}% internet penetration, showing good technological progress`)
            } else if (numValue > 40) {
              insights.push(`🌐 Moderate digital adoption with ${value}% internet users, indicating growing tech awareness`)
            } else {
              insights.push(`🌐 Digital connectivity at ${value}% shows potential for technological expansion`)
            }
          } else if (context.includes('smartphone') || context.includes('mobile')) {
            if (context.includes('crore') || context.includes('million')) {
              insights.push(`📱 Massive mobile adoption with ${value} crore smartphone users, demonstrating digital revolution`)
            } else {
              insights.push(`📱 Mobile penetration reaches ${value}%, showing widespread smartphone adoption`)
            }
          } else if (context.includes('5g') || context.includes('4g') || context.includes('broadband')) {
            insights.push(`📡 Advanced connectivity infrastructure offers ${value} Mbps speed, enabling high-speed digital services`)
          } else if (context.includes('app') || context.includes('downloads')) {
            insights.push(`📲 Digital platform engagement shows ${value} million downloads, indicating strong user adoption`)
          } else if (context.includes('ai') || context.includes('artificial intelligence')) {
            insights.push(`🤖 AI technology investment of ₹${value} crore signals advanced technological transformation`)
          } else if (context.includes('startup') || context.includes('tech company')) {
            insights.push(`🚀 Technology sector funding reaches ₹${value} crore, boosting innovation ecosystem`)
          } else {
            insights.push(`💻 Technology metrics show ${value} adoption rate, reflecting digital transformation`)
          }
        }
      }
    })

    return insights
  }

  // Extract environmental insights
  extractEnvironmentalInsights(text) {
    const insights = []

    // Environmental and climate data
    const environmentalPatterns = [
      /(?:temperature|तापमान|તાપમાન).*?(\d+(?:\.\d+)?)\s*(?:degrees?|celsius|fahrenheit|डिग्री|ડિગ્રી)/gi,
      /(?:rainfall|precipitation|बारिश|વરસાદ).*?(\d+(?:\.\d+)?)\s*(?:mm|millimeters?|inches?|मिमी|મિમી)/gi,
      /(?:pollution|air quality|प्रदूषण|પ્રદૂષણ).*?(?:aqi|index).*?(\d+)/gi,
      /(?:carbon|co2|कार्बन|કાર્બન).*?(\d+(?:\.\d+)?)\s*(?:ppm|tons?|tonnes?|टन|ટન)/gi
    ]

    environmentalPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const value = match[1]
        if (value && !isNaN(parseFloat(value))) {
          const context = match[0].substring(0, 80).trim()
          insights.push(`Environmental Data: ${context}`)
        }
      }
    })

    return insights
  }

  // Extract sports insights
  extractSportsInsights(text) {
    const insights = []

    // Sports scores and statistics
    const sportsPatterns = [
      /(?:scored?|runs?|goals?|points?|स्कोर|ગોલ).*?(\d+(?:-\d+)?)/gi,
      /(?:won|victory|जीत|જીત).*?(\d+(?:-\d+)?)/gi,
      /(?:cricket|football|hockey|tennis|क्रिकेट|ક્રિકેટ).*?(?:match|game|खेल|રમત).*?(\d+(?:-\d+)?)/gi
    ]

    sportsPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const score = match[1]
        if (score && /\d/.test(score)) {
          const context = match[0].substring(0, 60).trim()
          insights.push(`Sports Data: ${context}`)
        }
      }
    })

    return insights
  }

  // Extract education insights
  extractEducationInsights(text) {
    const insights = []

    // Education statistics and academic data
    const educationPatterns = [
      /(?:pass|passing|result|परिणाम|પરિણામ).*?(?:rate|percentage).*?(\d+(?:\.\d+)?)\s*(?:%|percent|प्रतिशत|ટકા)/gi,
      /(?:admission|enrollment|प्रवेश|પ્રવેશ).*?(\d+(?:,\d+)*)/gi,
      /(?:students?|छात्र|વિદ્યાર્થી).*?(\d+(?:,\d+)*)/gi,
      /(?:scholarship|छात्रवृत्ति|શિષ્યવૃત્તિ).*?(?:₹|rs\.?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|करोड़|લાખ)/gi
    ]

    educationPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const value = match[1]
        if (value && !isNaN(parseFloat(value.replace(/,/g, '')))) {
          const context = match[0].substring(0, 80).trim()
          insights.push(`Education Data: ${context}`)
        }
      }
    })

    return insights
  }

  // Extract comprehensive business and corporate insights
  extractBusinessInsights(text, originalText) {
    const insights = []
    
    // Enhanced business patterns with more comprehensive coverage
    const businessPatterns = [
      // Financial performance patterns
      /(?:company|corporation|firm|business|enterprise).*?(?:profit|revenue|sales|turnover|earnings|income).*?(?:₹|rs\.?|rupees?|\$|dollars?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|billion|million|thousand)/gi,
      /(?:quarterly|annual|yearly).*?(?:profit|revenue|sales|earnings).*?(?:₹|rs\.?|rupees?|\$|dollars?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|billion|million)/gi,
      
      // Corporate deals and transactions
      /(?:merger|acquisition|deal|takeover|buyout).*?(?:worth|valued|₹|rs\.?|rupees?|\$|dollars?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|billion|million)/gi,
      /(?:ipo|initial public offering|public listing).*?(?:₹|rs\.?|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|billion|million)/gi,
      
      // Investment and funding patterns
      /(?:investment|funding|raised|secured|attracted).*?(?:₹|rs\.?|rupees?|\$|dollars?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|billion|million)/gi,
      /(?:venture capital|private equity|angel investment|seed funding).*?(?:₹|rs\.?|rupees?|\$|dollars?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|billion|million)/gi,
      
      // Employment and workforce patterns
      /(?:jobs|employment|hiring|recruitment|workforce).*?(\d+(?:,\d+)*)\s*(?:people|employees|positions|jobs|workers)/gi,
      /(?:layoffs|job cuts|downsizing|retrenchment).*?(\d+(?:,\d+)*)\s*(?:people|employees|positions|jobs|workers)/gi,
      
      // Market and stock patterns
      /(?:stock price|share price|market cap|valuation).*?(?:₹|rs\.?|rupees?|\$|dollars?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|billion|million|per share)/gi,
      /(?:market share|market position).*?(\d+(?:\.\d+)?)\s*(?:%|percent|percentage)/gi,
      
      // Production and capacity patterns
      /(?:production|manufacturing|output|capacity).*?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:units|tonnes|tons|pieces|items|vehicles|products)/gi,
      
      // Expansion and growth patterns
      /(?:expansion|growth|increase|rise).*?(\d+(?:\.\d+)?)\s*(?:%|percent|percentage|times|fold)/gi,
      /(?:new|additional|extra).*?(?:stores|outlets|branches|offices|facilities).*?(\d+(?:,\d+)*)/gi
    ]

    businessPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const value = match[1]
        const numValue = parseFloat(value.replace(/,/g, ''))
        if (value && !isNaN(numValue)) {
          const context = match[0].toLowerCase()
          
          if (context.includes('profit') || context.includes('revenue') || context.includes('earnings') || context.includes('income')) {
            if (numValue > 1000) {
              insights.push(`🏢 Exceptional corporate financial performance with ₹${value} crore in earnings, demonstrating strong business growth and market leadership`)
            } else if (numValue > 100) {
              insights.push(`🏢 Strong corporate financial results showing ₹${value} crore in earnings, indicating healthy business performance`)
            } else {
              insights.push(`🏢 Corporate financial performance records ₹${value} crore in earnings, reflecting business operations`)
            }
          } else if (context.includes('merger') || context.includes('acquisition') || context.includes('takeover')) {
            if (numValue > 5000) {
              insights.push(`🤝 Mega corporate deal worth ₹${value} crore announced, significantly reshaping the industry landscape and market dynamics`)
            } else if (numValue > 1000) {
              insights.push(`🤝 Major corporate transaction valued at ₹${value} crore, creating substantial market consolidation`)
            } else {
              insights.push(`🤝 Corporate deal worth ₹${value} crore announced, contributing to industry restructuring`)
            }
          } else if (context.includes('ipo') || context.includes('public listing')) {
            insights.push(`📈 Public market debut with ₹${value} crore IPO, marking significant corporate milestone and investor opportunity`)
          } else if (context.includes('investment') || context.includes('funding') || context.includes('raised')) {
            if (numValue > 500) {
              insights.push(`💰 Substantial investment of ₹${value} crore secured, enabling major business expansion and strategic initiatives`)
            } else if (numValue > 100) {
              insights.push(`💰 Significant funding of ₹${value} crore raised, supporting business growth and development plans`)
            } else {
              insights.push(`💰 Investment of ₹${value} crore secured, boosting business expansion capabilities`)
            }
          } else if (context.includes('venture capital') || context.includes('private equity')) {
            insights.push(`🚀 Strategic venture funding of ₹${value} crore obtained, accelerating startup growth and innovation`)
          } else if (context.includes('jobs') || context.includes('employment') || context.includes('hiring')) {
            if (numValue > 10000) {
              insights.push(`👔 Massive employment generation with ${value} new positions created, significantly contributing to job market expansion`)
            } else if (numValue > 1000) {
              insights.push(`👔 Substantial job creation with ${value} new employment opportunities, boosting workforce development`)
            } else {
              insights.push(`👔 Employment opportunity creation with ${value} new positions, contributing to job market growth`)
            }
          } else if (context.includes('layoffs') || context.includes('job cuts')) {
            insights.push(`📉 Workforce reduction affecting ${value} employees, indicating corporate restructuring and cost optimization`)
          } else if (context.includes('stock price') || context.includes('share price') || context.includes('market cap')) {
            insights.push(`📊 Market valuation reaches ₹${value} crore, reflecting investor confidence and corporate worth`)
          } else if (context.includes('market share')) {
            if (numValue > 50) {
              insights.push(`🎯 Dominant market position with ${value}% market share, indicating industry leadership`)
            } else if (numValue > 25) {
              insights.push(`🎯 Strong market presence with ${value}% market share, showing competitive positioning`)
            } else {
              insights.push(`🎯 Market share stands at ${value}%, reflecting competitive market position`)
            }
          } else if (context.includes('production') || context.includes('manufacturing') || context.includes('output')) {
            insights.push(`🏭 Production capacity reaches ${value} units, demonstrating manufacturing scale and operational efficiency`)
          } else if (context.includes('expansion') || context.includes('growth') && context.includes('%')) {
            if (numValue > 50) {
              insights.push(`📈 Exceptional business growth of ${value}% achieved, indicating remarkable expansion and market success`)
            } else if (numValue > 20) {
              insights.push(`📈 Strong business growth at ${value}% recorded, showing healthy expansion trajectory`)
            } else {
              insights.push(`📈 Business growth of ${value}% observed, reflecting positive development trends`)
            }
          } else if (context.includes('stores') || context.includes('outlets') || context.includes('branches')) {
            insights.push(`🏪 Business expansion with ${value} new retail locations, strengthening market presence and customer reach`)
          } else {
            insights.push(`🏢 Business metric shows ${value} performance indicator, providing corporate insights`)
          }
        }
      }
    })

    return insights
  }

  // Extract infrastructure and development insights
  extractInfrastructureInsights(text, originalText) {
    const insights = []
    
    const infraPatterns = [
      /(?:road|highway|bridge|tunnel|railway|metro).*?(?:construction|built|completed).*?(?:₹|rs\.?|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|billion|million)/gi,
      /(?:project|scheme|initiative).*?(?:₹|rs\.?|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|billion|million)/gi,
      /(?:hospital|school|college|university).*?(?:built|constructed|established).*?(?:₹|rs\.?|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|billion|million)/gi,
      /(\d+)\s*(?:km|kilometers|miles).*?(?:road|highway|railway|metro)/gi
    ]

    infraPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const value = match[1]
        const context = match[0].toLowerCase()
        
        if (context.includes('road') || context.includes('highway') || context.includes('bridge')) {
          if (value.includes('crore') || value.includes('lakh')) {
            insights.push(`🛣️ Major infrastructure development with ₹${value} crore investment in transportation network`)
          } else {
            insights.push(`🛣️ Transportation infrastructure expansion covers ${value} km, improving connectivity`)
          }
        } else if (context.includes('hospital') || context.includes('school')) {
          insights.push(`🏥 Social infrastructure development with ₹${value} crore investment in public facilities`)
        } else if (context.includes('project') || context.includes('scheme')) {
          insights.push(`🏗️ Development project worth ₹${value} crore launched, boosting regional growth`)
        }
      }
    })

    return insights
  }

  // Extract legal and judicial insights
  extractLegalInsights(text, originalText) {
    const insights = []
    
    const legalPatterns = [
      /(?:court|judge|verdict|judgment|ruling).*?(?:sentenced?|fined?|penalty).*?(?:₹|rs\.?|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|years?|months?)/gi,
      /(?:case|lawsuit|litigation).*?(?:₹|rs\.?|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|lakh|billion|million)/gi,
      /(?:arrested|detained|custody).*?(\d+)\s*(?:people|persons|individuals)/gi
    ]

    legalPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const value = match[1]
        const context = match[0].toLowerCase()
        
        if (context.includes('sentenced') || context.includes('penalty')) {
          if (context.includes('years') || context.includes('months')) {
            insights.push(`⚖️ Judicial decision results in ${value} imprisonment, upholding rule of law`)
          } else {
            insights.push(`⚖️ Legal penalty of ₹${value} imposed by court, ensuring accountability`)
          }
        } else if (context.includes('case') || context.includes('lawsuit')) {
          insights.push(`⚖️ Legal proceedings involve ₹${value} crore, highlighting significant judicial matter`)
        } else if (context.includes('arrested') || context.includes('detained')) {
          insights.push(`🚔 Law enforcement action results in ${value} arrests, maintaining public order`)
        }
      }
    })

    return insights
  }

  // Extract general statistical insights (catch-all)
  extractStatisticalInsights(text, originalText) {
    const insights = []
    
    // General percentage patterns
    const percentagePatterns = [
      /(\d+(?:\.\d+)?)\s*(?:%|percent|percentage).*?(?:increase|decrease|rise|fall|growth|decline)/gi,
      /(?:increase|decrease|rise|fall|growth|decline).*?(\d+(?:\.\d+)?)\s*(?:%|percent|percentage)/gi
    ]

    percentagePatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const percentage = match[1]
        const context = match[0].substring(0, 100).trim()
        
        if (!context.toLowerCase().includes('gdp') && 
            !context.toLowerCase().includes('inflation') && 
            !context.toLowerCase().includes('unemployment') &&
            !context.toLowerCase().includes('turnout')) {
          insights.push(`📊 Statistical trend shows ${percentage}% change, indicating measurable impact in the sector`)
        }
      }
    })

    // General numerical data
    const numberPatterns = [
      /(\d+(?:,\d+)*)\s*(?:people|persons|individuals|citizens|residents)/gi,
      /(\d+(?:,\d+)*)\s*(?:students|children|women|men)/gi,
      /(\d+(?:,\d+)*)\s*(?:houses|homes|buildings|units)/gi
    ]

    numberPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const number = match[1]
        const context = match[0].toLowerCase()
        
        if (context.includes('people') || context.includes('persons')) {
          insights.push(`👥 Population data indicates ${number} individuals affected, showing scale of impact`)
        } else if (context.includes('students') || context.includes('children')) {
          insights.push(`🎓 Educational demographics show ${number} beneficiaries, highlighting educational reach`)
        } else if (context.includes('houses') || context.includes('homes')) {
          insights.push(`🏠 Housing data reveals ${number} residential units, indicating development scale`)
        }
      }
    })

    return insights
  }

  // Enhanced deduplication of insights
  deduplicateInsights(insights) {
    const unique = []
    const seenPatterns = new Set()
    
    for (const insight of insights) {
      // Create a pattern signature for better deduplication
      const signature = this.createInsightSignature(insight)
      
      // Also check for semantic similarity with existing insights
      let isDuplicate = false
      
      if (seenPatterns.has(signature)) {
        isDuplicate = true
      } else {
        // Check for semantic similarity with existing insights
        for (const existingInsight of unique) {
          if (this.areInsightsSimilar(insight, existingInsight)) {
            isDuplicate = true
            break
          }
        }
      }
      
      if (!isDuplicate) {
        seenPatterns.add(signature)
        unique.push(insight)
      }
    }
    
    return unique
  }
  
  // Check if two insights are semantically similar
  areInsightsSimilar(insight1, insight2) {
    // Extract numbers from both insights
    const numbers1 = insight1.match(/\d+(?:\.\d+)?/g) || []
    const numbers2 = insight2.match(/\d+(?:\.\d+)?/g) || []
    
    // If they have the same numbers, they might be duplicates
    if (numbers1.length > 0 && numbers2.length > 0) {
      const commonNumbers = numbers1.filter(num => numbers2.includes(num))
      if (commonNumbers.length > 0) {
        // Check if they're talking about the same topic
        const words1 = new Set(insight1.toLowerCase().split(/\s+/).filter(w => w.length > 4))
        const words2 = new Set(insight2.toLowerCase().split(/\s+/).filter(w => w.length > 4))
        
        const commonWords = [...words1].filter(word => words2.has(word))
        const similarity = commonWords.length / Math.max(words1.size, words2.size)
        
        return similarity > 0.4 // 40% word overlap with same numbers = likely duplicate
      }
    }
    
    return false
  }
  
  // Create signature for insight deduplication
  createInsightSignature(insight) {
    // Extract key numbers and words for comparison
    const numbers = insight.match(/\d+(?:\.\d+)?/g) || []
    const keyWords = insight.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4)
      .filter(word => !['shows', 'indicates', 'reflects', 'demonstrates', 'observed', 'recorded', 'with', 'crore', 'percent', 'percentage'].includes(word))
      .slice(0, 8) // Increased for better uniqueness
      .sort()
      .join(' ')
    
    // Also include the emoji category for better differentiation
    const emoji = insight.substring(0, 2)
    
    return `${emoji}|${numbers.join('-')}|${keyWords}`
  }
  
  // Sort insights by importance and category
  sortInsightsByImportance(insights) {
    const categoryOrder = {
      '🗳️': 1,  // Political
      '💰': 2,  // Economic
      '🏥': 3,  // Health
      '👥': 4,  // Social
      '💻': 5,  // Technology
      '🌍': 6,  // Environmental
      '🏆': 7,  // Sports
      '📚': 8,  // Education
      '🏢': 9,  // Business
      '🏗️': 10, // Infrastructure
      '⚖️': 11, // Legal
      '📊': 12  // Statistical
    }
    
    return insights.sort((a, b) => {
      const categoryA = a.substring(0, 2)
      const categoryB = b.substring(0, 2)
      
      const orderA = categoryOrder[categoryA] || 99
      const orderB = categoryOrder[categoryB] || 99
      
      return orderA - orderB
    })
  }

  // Generate enhanced article summary when no specific insights are found
  generateArticleSummary(headline, content) {
    try {
      // Clean and prepare text
      const text = content.replace(/\s+/g, ' ').trim()
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20)
      
      // Find the most informative sentences
      const rankedSentences = this.rankSentencesByInformation(sentences, headline)
      
      if (rankedSentences.length > 0) {
        // Take top 2-3 sentences based on content length
        const topSentences = rankedSentences.slice(0, content.length > 500 ? 3 : 2)
        const summary = topSentences.map(s => s.sentence.trim()).join('. ')
        
        // Ensure summary is not too long
        const finalSummary = summary.length > 250 ? summary.substring(0, 247) + '...' : summary
        
        return `📄 Article Summary: ${finalSummary}`
      } else {
        // Enhanced fallback based on headline analysis
        const headlineInsights = this.extractHeadlineInsights(headline)
        if (headlineInsights) {
          return `📄 Article Focus: ${headlineInsights}`
        }
        
        return `📄 Article covers: ${headline.substring(0, 150)}${headline.length > 150 ? '...' : ''}`
      }
    } catch (error) {
      return `📄 Article discusses: ${headline.substring(0, 100)}${headline.length > 100 ? '...' : ''}`
    }
  }
  
  // Rank sentences by information content
  rankSentencesByInformation(sentences, headline) {
    const headlineWords = new Set(headline.toLowerCase().split(/\s+/).filter(w => w.length > 3))
    
    return sentences.map(sentence => {
      const words = sentence.toLowerCase().split(/\s+/)
      let score = 0
      
      // Score based on various factors
      score += words.length > 10 ? 2 : 0 // Prefer longer sentences
      score += words.filter(w => headlineWords.has(w)).length * 3 // Headline relevance
      score += (sentence.match(/\b(said|says|told|according|announced|reported|revealed|confirmed|stated|declared)\b/gi) || []).length * 2 // News language
      score += (sentence.match(/\b(government|minister|court|police|hospital|school|company|organization)\b/gi) || []).length * 1 // Important entities
      score += (sentence.match(/\d+/g) || []).length * 1 // Contains numbers
      score += sentence.includes('"') ? 1 : 0 // Contains quotes
      
      // Penalize very short or very long sentences
      if (words.length < 8 || words.length > 40) score -= 1
      
      return { sentence, score }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
  }
  
  // Extract insights from headline when no content insights are found
  extractHeadlineInsights(headline) {
    const lower = headline.toLowerCase()
    
    // Check for different types of news
    if (lower.includes('election') || lower.includes('vote') || lower.includes('poll')) {
      return `This article discusses electoral developments and political activities`
    } else if (lower.includes('economy') || lower.includes('gdp') || lower.includes('inflation') || lower.includes('market')) {
      return `This article covers economic developments and financial matters`
    } else if (lower.includes('health') || lower.includes('hospital') || lower.includes('medical') || lower.includes('covid')) {
      return `This article reports on health-related developments and medical updates`
    } else if (lower.includes('education') || lower.includes('school') || lower.includes('university') || lower.includes('student')) {
      return `This article focuses on educational developments and academic matters`
    } else if (lower.includes('technology') || lower.includes('digital') || lower.includes('internet') || lower.includes('ai')) {
      return `This article discusses technological advancements and digital developments`
    } else if (lower.includes('environment') || lower.includes('climate') || lower.includes('pollution') || lower.includes('green')) {
      return `This article covers environmental issues and climate-related developments`
    } else if (lower.includes('sports') || lower.includes('cricket') || lower.includes('football') || lower.includes('match')) {
      return `This article reports on sports events and athletic achievements`
    } else if (lower.includes('business') || lower.includes('company') || lower.includes('corporate') || lower.includes('industry')) {
      return `This article covers business developments and corporate activities`
    } else {
      return null
    }
  }

  // Helper function to normalize party names
  normalizePartyName(party) {
    const partyMap = {
      'bjp': 'BJP',
      'bharatiya janata party': 'BJP',
      'congress': 'Congress',
      'indian national congress': 'Congress',
      'aap': 'AAP',
      'aam aadmi party': 'AAP',
      'sp': 'Samajwadi Party',
      'samajwadi party': 'Samajwadi Party',
      'bsp': 'BSP',
      'bahujan samaj party': 'BSP',
      'tmc': 'TMC',
      'trinamool congress': 'TMC',
      'dmk': 'DMK',
      'aiadmk': 'AIADMK',
      'jdu': 'JDU',
      'janata dal': 'JDU',
      'rjd': 'RJD',
      'rashtriya janata dal': 'RJD',
      'shiv sena': 'Shiv Sena',
      'ncp': 'NCP',
      'nationalist congress party': 'NCP',
      'भाजपा': 'BJP',
      'कांग्रेस': 'Congress',
      'आम आदमी पार्टी': 'AAP',
      'समाजवादी पार्टी': 'Samajwadi Party',
      'बसपा': 'BSP',
      'ભાજપ': 'BJP',
      'કોંગ્રેસ': 'Congress',
      'આમ આદમી પાર્ટી': 'AAP'
    }
    
    return partyMap[party.toLowerCase()] || party.toUpperCase()
  }
}

export default new NewspaperProcessor()
