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
          analysisMethod: result.confidence === 'medium' ? 'local' : 'ai' // Track analysis method
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
          analysisError: error.message
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
}

export default new NewspaperProcessor()
