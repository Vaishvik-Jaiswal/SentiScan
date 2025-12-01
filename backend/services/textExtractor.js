import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import Tesseract from 'tesseract.js'
import sharp from 'sharp'
import pdf2pic from 'pdf2pic'
import pdfPoppler from 'pdf-poppler'
import fs from 'fs'
import path from 'path'
import sentimentAnalysis from './sentimentAnalysis.js'

// Test imports on startup
console.log('📚 Enhanced text extractor service loading...')
console.log('📄 PDF parser available:', typeof pdfParse)
console.log('📝 Mammoth available:', typeof mammoth)
console.log('🖼️ Tesseract OCR available:', typeof Tesseract)
console.log('🖼️ Sharp image processor available:', typeof sharp)
console.log('🔄 PDF2Pic converter available:', typeof pdf2pic)
console.log('🔄 PDF-Poppler converter available:', typeof pdfPoppler)

// Test pdf2pic functionality
try {
  if (typeof pdf2pic === 'function') {
    console.log('✅ PDF2Pic constructor is properly accessible')
  } else {
    console.error('❌ PDF2Pic constructor is not accessible')
  }
} catch (error) {
  console.error('❌ Error testing PDF2Pic:', error.message)
}

// Test PDF parser functionality
if (typeof pdfParse === 'function') {
  console.log('✅ PDF parser is properly loaded and ready')
} else {
  console.error('❌ PDF parser is not properly loaded!')
}

class TextExtractorService {
  constructor() {
    // Initialize Tesseract worker pool for better performance
    this.workerPool = new Map()
    this.maxWorkers = 2
    this.currentWorker = 0
  }

  async getOrCreateWorker(language = 'eng+hin+guj+tel') {
    const workerId = `worker_${this.currentWorker}`

    if (!this.workerPool.has(workerId)) {
      console.log(`🔧 Creating new Tesseract worker: ${workerId} with languages: ${language}`)
      const worker = await Tesseract.createWorker(language, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`📊 OCR Progress (${workerId}): ${Math.round(m.progress * 100)}%`)
          }
        },
        // Initialize with proper parameters
        tessedit_pageseg_mode: '1', // Automatic page segmentation with OSD
        tessedit_ocr_engine_mode: '1', // LSTM neural networks
        preserve_interword_spaces: '1', // Preserve spacing
      })
      this.workerPool.set(workerId, worker)
    }

    this.currentWorker = (this.currentWorker + 1) % this.maxWorkers
    return this.workerPool.get(workerId)
  }

  async extractText(buffer, fileType, originalName) {
    console.log(`📄 Extracting text from ${fileType} file: ${originalName}`)

    try {
      let extractedText = ''
      let heading = ''

      switch (fileType.toLowerCase()) {
        case 'pdf':
          console.log('📄 Processing PDF file with image conversion approach...')
          console.log(`📊 PDF buffer info: size=${buffer.length} bytes`)

          extractedText = await this.extractTextFromPDFWithOCR(buffer, originalName)
          console.log(`✅ PDF OCR processing completed: ${extractedText.length} characters`)
          break

        case 'docx':
          console.log('📄 Processing DOCX file...')
          const docxResult = await mammoth.extractRawText({ buffer })
          extractedText = docxResult.value
          console.log(`✅ DOCX extracted: ${extractedText.length} characters`)
          break

        case 'txt':
          console.log('📄 Processing TXT file...')
          extractedText = buffer.toString('utf-8')
          console.log(`✅ TXT extracted: ${extractedText.length} characters`)
          break

        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'bmp':
        case 'webp':
        case 'tiff':
        case 'tif':
          console.log(`🖼️ Processing ${fileType.toUpperCase()} image file...`)
          extractedText = await this.extractTextFromImage(buffer, fileType)
          console.log(`✅ OCR extracted: ${extractedText.length} characters`)
          break

        default:
          throw new Error(`Unsupported file type: ${fileType}`)
      }

      // Ensure we always have some meaningful text
      if (!extractedText || extractedText.trim().length === 0) {
        console.log(`⚠️ No text extracted from ${fileType} file, using filename as content`)
        extractedText = `This is a ${fileType.toUpperCase()} document named "${originalName}". The file appears to be image-based, protected, or could not be processed for text extraction.`
      }

      // Handle very short extractions (likely scanned PDFs)
      else if (extractedText.trim().length < 20) {
        console.log(`⚠️ Very short text extraction (${extractedText.trim().length} chars), enhancing with metadata`)
        const originalText = extractedText.trim()
        extractedText = `This is a ${fileType.toUpperCase()} document named "${originalName}". Limited text was extracted: "${originalText}". This suggests the document may be primarily image-based or scanned.`
      }

      // Extract heading using OpenAI
      try {
        console.log('🔍 Attempting AI heading extraction...')
        console.log(`📝 Text preview for heading extraction: "${extractedText.substring(0, 300)}..."`)

        if (!extractedText || extractedText.trim().length < 10) {
          console.log('⚠️ Text too short for AI heading extraction, using fallback')
          heading = this.generateFallbackHeading(originalName, extractedText)
        } else {
          heading = await this.extractHeadingWithAI(extractedText)
          console.log(`✅ AI heading extraction successful: "${heading}"`)
        }
      } catch (headingError) {
        console.error('❌ AI heading extraction failed:', headingError.message)
        console.log('🔄 Using fallback heading generation...')
        heading = this.generateFallbackHeading(originalName, extractedText)
      }

      // Ensure we always have a heading
      if (!heading || heading.trim().length === 0) {
        console.log('⚠️ No heading generated, creating final fallback...')
        heading = this.generateFallbackHeading(originalName, extractedText)
      }

      console.log(`📰 Final heading: "${heading}"`)

      // Clean up the text
      extractedText = extractedText.replace(/\s+/g, ' ').trim()

      const result = {
        heading: heading || 'Untitled',
        content: extractedText,
        detectedLanguage: this.detectLanguage(extractedText),
      }

      console.log('✅ Text extraction completed:', {
        heading: result.heading.substring(0, 50) + '...',
        contentLength: result.content.length,
        detectedLanguage: result.detectedLanguage
      })

      return result
    } catch (error) {
      console.error('❌ Error extracting text:', error)
      console.error('❌ File info:', { fileType, originalName, bufferSize: buffer?.length })
      throw new Error(`Failed to extract text from ${fileType} file: ${error.message}`)
    }
  }

  async extractHeadingWithAI(text) {
    console.log('🤖 Extracting heading using Azure OpenAI...')

    // Check if we have meaningful text to work with
    if (!text || text.trim().length < 10) {
      console.log('⚠️ No meaningful text available for heading extraction')
      return 'Document Content'
    }

    // First, detect the language of the article
    const detectedLanguage = this.detectLanguage(text)
    console.log(`🌐 Detected article language: ${detectedLanguage}`)

    // Fallback method for when AI is not available
    const fallbackHeading = () => {
      console.log('⚠️ Using fallback heading extraction...')
      const lines = text.split('\n').filter(line => line.trim().length > 0)
      if (lines.length === 0) {
        console.log('⚠️ No lines found in text, using default heading')
        return 'Document Content'
      }

      // Enhanced OCR-specific patterns to skip
      const skipPatterns = [
        /main paper/i,
        /page[-\s]*\d+/i,
        /\d{4}[-\s]*\d+/i, // Issue numbers
        /edition/i,
        /section/i,
        /breaking news/i,
        /sports/i,
        /politics/i,
        /business/i,
        /entertainment/i,
        /^[a-z\s]+\|/i, // Text followed by |
        /thehitavada|times of india|hindustan times|indian express|hindu|telegraph|gujarat samachar|sandesh|divya bhaskar/i,
        /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/, // Dates
        /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|સોમવાર|મંગળવાર|બુધવાર|ગુરુવાર|શુક્રવાર|શનિવાર|રવિવાર)/i, // Days
        /^[A-Z][a-z]+,?\s*\d{1,2}/, // Location with date
        /^[A-Z][a-z]+:\s*/, // Location with colon
        /NEW DELHI|AHMEDABAD|GANDHINAGAR|RAJKOT|SURAT|નવી દિલ્હી|અમદાવાદ|ગાંધીનગર/i,
        /PTI|ANI|UNI/i,
        /^[A-Z]+,/i, // City names in all caps followed by comma
        /^\s*\d+\s*$/, // Just numbers
        /^[^\w\u0900-\u097F\u0A80-\u0AFF]+$/, // Only punctuation
      ]

      // Try to find a good heading by analyzing more lines
      for (let i = 0; i < Math.min(lines.length, 25); i++) {
        let line = lines[i].trim()

        // Skip if too short or too long
        if (line.length < 15 || line.length > 200) continue

        // Check against all skip patterns
        const shouldSkip = skipPatterns.some(pattern => pattern.test(line))
        if (shouldSkip) {
          console.log(`⏭️ Fallback skipping: "${line.substring(0, 50)}..."`)
          continue
        }

        // Skip all-caps section headers (but allow proper headlines)
        if (line === line.toUpperCase() && line.length < 50 && !line.includes(' ')) {
          console.log(`📢 Fallback skipping caps: "${line}"`)
          continue
        }

        // Language-specific headline detection
        if (detectedLanguage === 'hindi' || detectedLanguage === 'gujarati') {
          const hasDevanagari = /[\u0900-\u097F]/.test(line)
          const hasGujarati = /[\u0A80-\u0AFF]/.test(line)

          if ((detectedLanguage === 'hindi' && hasDevanagari) ||
            (detectedLanguage === 'gujarati' && hasGujarati)) {
            const heading = line.length > 100 ? line.substring(0, 100) + '...' : line
            console.log(`✅ Fallback found ${detectedLanguage} heading: "${heading}"`)
            return heading
          }
        } else {
          // Enhanced English headline detection
          const hasActionWords = /\b(announces?|launches?|wins?|loses?|introduces?|reveals?|confirms?|denies?|reports?|says?|claims?|begins?|ends?|starts?|completes?|approves?|rejects?|implements?|inaugurates?|celebrates?)\b/i.test(line)
          const hasProperStructure = /^[A-Z].*[a-z].*/.test(line) && line.split(' ').length >= 3
          const hasNewsIndicators = /\b(government|minister|president|prime|chief|committee|court|supreme|high|parliament|assembly|budget|policy|scheme|project|program|initiative)\b/i.test(line)

          if (hasActionWords || (hasProperStructure && hasNewsIndicators) || hasProperStructure) {
            const heading = line.length > 100 ? line.substring(0, 100) + '...' : line
            console.log(`✅ Fallback found English heading: "${heading}"`)
            return heading
          }
        }
      }

      // Last resort: use first non-skipped line
      for (let i = 0; i < Math.min(lines.length, 25); i++) {
        let line = lines[i].trim()
        if (line.length >= 15 && line.length <= 150) {
          const shouldSkip = skipPatterns.some(pattern => pattern.test(line))
          if (!shouldSkip) {
            const heading = line.length > 100 ? line.substring(0, 100) + '...' : line
            console.log(`✅ Fallback found basic heading: "${heading}"`)
            return heading
          }
        }
      }

      // Absolute last resort: use first meaningful line
      const lastResort = lines.find(line => line.trim().length > 10)?.trim()
      console.log(`⚠️ Fallback last resort: "${lastResort}"`)
      return lastResort || 'Untitled'
    }

    try {
      // Force initialization of OpenAI
      const openaiClient = sentimentAnalysis.openai

      // Double-check if OpenAI is configured
      if (!openaiClient) {
        console.log('⚠️ Azure OpenAI client not available, using fallback heading extraction')
        return fallbackHeading()
      }

      // Use the full content for better context
      const textSample = text.substring(0, 4000) // Increased to 4000 chars

      // Create a language-specific prompt
      let languageSpecificInstructions = ''

      if (detectedLanguage === 'hindi') {
        languageSpecificInstructions = `
- The article appears to be in Hindi (Devanagari script)
- EXTRACT THE HEADLINE IN HINDI, not English
- Look for Devanagari text (देवनागरी) that appears to be a headline
- Return the headline in the original Hindi language
- Do not transliterate or translate the headline to English`
      } else if (detectedLanguage === 'gujarati') {
        languageSpecificInstructions = `
- The article appears to be in Gujarati script
- EXTRACT THE HEADLINE IN GUJARATI, not English
- Look for Gujarati text (ગુજરાતી) that appears to be a headline
- Return the headline in the original Gujarati language
- Do not transliterate or translate the headline to English`
      } else {
        languageSpecificInstructions = `
- The article appears to be in English
- Extract the headline in English
- Ignore any non-English text in headers or metadata`
      }

      const systemPrompt = {
        role: 'system',
        content: `You are an expert multilingual newspaper headline extractor. Your task is to analyze OCR-scanned newspaper text and extract ONLY the main headline.

CRITICAL INSTRUCTIONS:
1. IGNORE completely (these are NOT headlines):
   - "NEW DELHI, Sept 5 (PTI)" or any similar location/date/agency patterns
   - "Main Paper Nagpur | 2025-00406 | Page-3" or any page/issue numbers
   - Newspaper names like "TheHitavada", "Times of India", "Gujarat Samachar", "Sandesh", etc.
   - Section headers like "SPORTS", "POLITICS", "BREAKING NEWS"
   - Bylines like "By Our Staff Reporter"
   - Any text containing "PTI", "ANI", "UNI" or news agency abbreviations
   - Page numbers, dates, or location headers
   - City names like "અમદાવાદ", "ગાંધીનગર", "AHMEDABAD", "GANDHINAGAR"

2. LANGUAGE SPECIFIC INSTRUCTIONS:${languageSpecificInstructions}

3. FIND and extract:
   - The actual news story headline (the title of the main article)
   - It should describe an event, announcement, statement, or development
   - It will typically appear near the top of the article after metadata
   - It may be in a different font/style in the original (though you can't see this)

4. FORMAT:
   - Return ONLY the clean headline text in the ORIGINAL LANGUAGE
   - No quotes, no prefixes, no extra text
   - If multiple headlines exist, choose the most important one
   - NEVER translate or transliterate the headline

EXAMPLES:

Input: "NEW DELHI, Sept 5 (PTI)\nPM launches new welfare scheme for farmers\nThe Prime Minister yesterday announced..."
Output: PM launches new welfare scheme for farmers

Input: "TheHitavada\nNagpur, Monday\nसरकार ने किसानों के लिए नई योजना की घोषणा की\nकृषि मंत्री ने कहा कि..."
Output: सरकार ने किसानों के लिए नई योजना की घोषणा की

Input: "Gujarat Samachar | અમદાવાદ | પેજ-3\nભારત સરકાર દ્વારા નવી શિક્ષણ નીતિ જાહેર\nગુજરાત રાજ્યમાં..."
Output: ભારત સરકાર દ્વારા નવી શિક્ષણ નીતિ જાહેર

REMEMBER: Extract ONLY the main headline in the SAME LANGUAGE as the article content.`
      }

      const userPrompt = {
        role: 'user',
        content: `Extract ONLY the main headline from this newspaper article text. Return it in the ORIGINAL LANGUAGE (${detectedLanguage}):\n\n${textSample}`
      }

      console.log('📤 Sending heading extraction request to Azure OpenAI...')
      console.log('📝 Text sample (first 200 chars):', textSample.substring(0, 200) + '...')

      const response = await openaiClient.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT,
        messages: [systemPrompt, userPrompt],
        temperature: 0.1,
        max_tokens: 250, // Increased for longer headlines in non-Latin scripts
      })

      const extractedHeading = response.choices[0]?.message?.content?.trim()
      console.log('🔄 Raw AI response:', extractedHeading)

      if (!extractedHeading || extractedHeading.toLowerCase() === 'untitled' || extractedHeading.length < 5) {
        console.log('⚠️ OpenAI could not extract a clear heading, using fallback')
        return fallbackHeading()
      }

      // Clean up the extracted heading
      let heading = extractedHeading
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/^[-–•*]\s*/, '') // Remove bullet points
        .replace(/^\d+[\.\)]\s*/, '') // Remove numbering
        .replace(/^Output:\s*/i, '') // Remove "Output:" prefix
        .replace(/^Headline:\s*/i, '') // Remove "Headline:" prefix
        .trim()

      // Enhanced invalid pattern checking
      const invalidPatterns = [
        /NEW DELHI,?\s+[A-Za-z]+\s+\d+\s*\([A-Z]+\)/i,
        /અમદાવાદ,?\s+[A-Za-z]+\s+\d+/i, // Gujarati city patterns
        /ગાંધીનગર,?\s+[A-Za-z]+\s+\d+/i,
        /page[-\s]*\d+/i,
        /\d{4}[-\s]*\d+/i, // Issue numbers
        /main paper/i,
        /^[A-Z]+,/i, // City names in all caps followed by comma
        /\(PTI\)|\(ANI\)|\(UNI\)/i,
        /gujarat samachar|sandesh|divya bhaskar/i,
      ]

      const isInvalidHeading = invalidPatterns.some(pattern => pattern.test(heading))

      if (isInvalidHeading) {
        console.log('⚠️ AI returned invalid heading (metadata), using fallback')
        return fallbackHeading()
      }

      // Enhanced language validation
      const hasDevanagari = /[\u0900-\u097F]/.test(heading)
      const hasGujarati = /[\u0A80-\u0AFF]/.test(heading)
      const hasLatin = /[a-zA-Z]/.test(heading)

      if (detectedLanguage === 'hindi' && !hasDevanagari && hasLatin) {
        console.log('⚠️ Expected Hindi heading but got non-Devanagari script, using fallback')
        return fallbackHeading()
      }

      if (detectedLanguage === 'gujarati' && !hasGujarati && hasLatin) {
        console.log('⚠️ Expected Gujarati heading but got non-Gujarati script, using fallback')
        return fallbackHeading()
      }

      if (detectedLanguage === 'english' && (!hasLatin || (hasDevanagari || hasGujarati) && !hasLatin)) {
        console.log('⚠️ Expected English heading but got non-Latin script, using fallback')
        return fallbackHeading()
      }

      // Truncate if too long
      if (heading.length > 150) {
        heading = heading.substring(0, 150) + '...'
      }

      console.log(`✅ AI extracted heading in ${detectedLanguage}: "${heading}"`)
      return heading

    } catch (error) {
      console.error('❌ Error extracting heading with AI:', error)
      console.error('❌ Error details:', error.message)
      console.log('⚠️ Falling back to basic heading extraction')
      return fallbackHeading()
    }
  }

  detectLanguage(text) {
    console.log('🔍 Detecting language from text...')

    // Use a larger sample for more accurate detection
    const sample = text.substring(0, 3000).toLowerCase()

    // Enhanced language pattern detection
    const hindiPattern = /[\u0900-\u097F]/g
    const gujaratiPattern = /[\u0A80-\u0AFF]/g
    const teluguPattern = /[\u0C00-\u0C7F]/g
    const englishPattern = /[a-z]/g

    // Additional patterns for better detection
    const hindiWords = /\b(और|है|में|के|से|को|का|की|पर|एक|यह|वह|भारत|सरकार|मंत्री|प्रधान|राज्य)\b/gi
    const gujaratiWords = /\b(અને|છે|માં|ના|થી|ને|ની|પર|એક|આ|તે|ભારત|સરકાર|મંત્રી|પ્રધાન|રાજ્ય)\b/gi
    const teluguWords = /\b(మరియు|ఉంది|లో|యొక్క|నుండి|కు|యొక్క|పై|ఒక|ఇది|అది|భారత్|ప్రభుత్వం|మంత్రి|ప్రధాన|రాష్ట్ర|తెలుగు|ఆంధ్రప్రదేశ్|తెలంగాణ|హైదరాబాద్|విశాఖపట్టణం|విజయవాడ|వారంగల్|గుంటూర్|నెల్లూర్|కరీంనగర్|కాకినాడ|అనంతపుర్|చిత్తూర్|కడప|నిజామాబాద్|కుర్నూల్|మహబూబనగర్|అదిలాబాద్|సికందరాబాద్|మెడకల్|తిరుపతి|రాయలసీమ)\b/gi
    const englishWords = /\b(and|is|in|of|to|the|a|an|this|that|india|government|minister|prime|state|new|said|will|has|been)\b/gi

    const hindiMatches = (sample.match(hindiPattern) || []).length
    const gujaratiMatches = (sample.match(gujaratiPattern) || []).length
    const teluguMatches = (sample.match(teluguPattern) || []).length
    const englishMatches = (sample.match(englishPattern) || []).length

    const hindiWordMatches = (sample.match(hindiWords) || []).length
    const gujaratiWordMatches = (sample.match(gujaratiWords) || []).length
    const teluguWordMatches = (sample.match(teluguWords) || []).length
    const englishWordMatches = (sample.match(englishWords) || []).length

    const total = hindiMatches + gujaratiMatches + teluguMatches + englishMatches

    console.log(`📊 Language detection results:`, {
      hindi: { chars: hindiMatches, words: hindiWordMatches },
      gujarati: { chars: gujaratiMatches, words: gujaratiWordMatches },
      telugu: { chars: teluguMatches, words: teluguWordMatches },
      english: { chars: englishMatches, words: englishWordMatches },
      total: total
    })

    if (total === 0) {
      return 'unknown'
    }

    // Calculate weighted scores (characters + word matches * 3)
    const hindiScore = hindiMatches + (hindiWordMatches * 3)
    const gujaratiScore = gujaratiMatches + (gujaratiWordMatches * 3)
    const teluguScore = teluguMatches + (teluguWordMatches * 3)
    const englishScore = englishMatches + (englishWordMatches * 2) // Less weight for English words

    const totalScore = hindiScore + gujaratiScore + teluguScore + englishScore

    if (totalScore === 0) {
      return 'unknown'
    }

    // Calculate percentages
    const hindiPercent = (hindiScore / totalScore) * 100
    const gujaratiPercent = (gujaratiScore / totalScore) * 100
    const teluguPercent = (teluguScore / totalScore) * 100
    const englishPercent = (englishScore / totalScore) * 100

    console.log(`📊 Language score percentages:`, {
      hindi: `${hindiPercent.toFixed(1)}%`,
      gujarati: `${gujaratiPercent.toFixed(1)}%`,
      telugu: `${teluguPercent.toFixed(1)}%`,
      english: `${englishPercent.toFixed(1)}%`
    })

    // Determine dominant language with improved thresholds
    const nonLatinThreshold = 25 // Lowered threshold for better detection of Telugu
    const latinThreshold = 50

    if (hindiPercent >= nonLatinThreshold && hindiPercent > gujaratiPercent && hindiPercent > teluguPercent && hindiPercent > englishPercent) {
      console.log(`✅ Detected language: Hindi (${hindiPercent.toFixed(1)}%)`)
      return 'hindi'
    }

    if (gujaratiPercent >= nonLatinThreshold && gujaratiPercent > hindiPercent && gujaratiPercent > teluguPercent && gujaratiPercent > englishPercent) {
      console.log(`✅ Detected language: Gujarati (${gujaratiPercent.toFixed(1)}%)`)
      return 'gujarati'
    }

    if (teluguPercent >= nonLatinThreshold && teluguPercent > hindiPercent && teluguPercent > gujaratiPercent && teluguPercent > englishPercent) {
      console.log(`✅ Detected language: Telugu (${teluguPercent.toFixed(1)}%)`)
      return 'telugu'
    }

    if (englishPercent >= latinThreshold) {
      console.log(`✅ Detected language: English (${englishPercent.toFixed(1)}%)`)
      return 'english'
    }

    // If no clear winner, use the highest percentage
    const maxPercent = Math.max(hindiPercent, gujaratiPercent, teluguPercent, englishPercent)

    if (maxPercent === hindiPercent && hindiPercent > 15) {
      console.log(`✅ Detected primary language: Hindi (${hindiPercent.toFixed(1)}%)`)
      return 'hindi'
    }
    if (maxPercent === gujaratiPercent && gujaratiPercent > 15) {
      console.log(`✅ Detected primary language: Gujarati (${gujaratiPercent.toFixed(1)}%)`)
      return 'gujarati'
    }
    if (maxPercent === teluguPercent && teluguPercent > 15) {
      console.log(`✅ Detected primary language: Telugu (${teluguPercent.toFixed(1)}%)`)
      return 'telugu'
    }
    if (maxPercent === englishPercent) {
      console.log(`✅ Detected primary language: English (${englishPercent.toFixed(1)}%)`)
      return 'english'
    }

    // Final fallback
    console.log(`⚠️ Could not determine language clearly, defaulting to English`)
    return 'english'
  }

  generateFallbackHeading(originalName, extractedText) {
    console.log('🔄 Generating fallback heading...')
    console.log(`📝 Available text length: ${extractedText?.length || 0} characters`)

    // If we have some text, try to extract a meaningful heading
    if (extractedText && extractedText.trim().length > 5) {
      console.log(`📰 Attempting to extract heading from text: "${extractedText.substring(0, 200)}..."`)

      const lines = extractedText.split(/[\n\r]/).map(line => line.trim()).filter(line => line.length > 3)
      console.log(`📄 Found ${lines.length} text lines`)

      if (lines.length > 0) {
        // Look for the best line to use as heading
        for (const line of lines) {
          // Skip very short lines or lines that look like artifacts
          if (line.length >= 10 && line.length <= 150) {
            // Check if it looks like a proper heading (not just random characters)
            const wordCount = line.split(/\s+/).filter(word => word.length > 1).length
            if (wordCount >= 2) {
              let heading = line.trim()
              if (heading.length > 100) {
                heading = heading.substring(0, 97) + '...'
              }
              console.log(`✅ Generated fallback heading from text: "${heading}"`)
              return heading
            }
          }
        }

        // If no good single line, try first few words
        const allWords = extractedText.trim().split(/\s+/).filter(word => word.length > 1)
        if (allWords.length >= 3) {
          const heading = allWords.slice(0, 8).join(' ') + (allWords.length > 8 ? '...' : '')
          console.log(`✅ Generated fallback heading from first words: "${heading}"`)
          return heading
        }
      }
    }

    // If no meaningful text, generate heading from filename
    const baseName = originalName.replace(/\.[^/.]+$/, "") // Remove extension
    const heading = `Newspaper Article: ${baseName}`
    console.log(`✅ Generated fallback heading from filename: "${heading}"`)
    return heading
  }

  ensureTempDirectory() {
    const tempDir = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
      console.log(`📁 Created temp directory: ${tempDir}`)
    }
    return tempDir
  }

  cleanupTempFiles() {
    try {
      const tempDir = path.join(process.cwd(), 'temp')
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir)
        files.forEach(file => {
          if (file.startsWith('page')) {
            const filePath = path.join(tempDir, file)
            fs.unlinkSync(filePath)
          }
        })
        console.log(`🧹 Cleaned up ${files.length} temporary files`)
      }
    } catch (error) {
      console.warn('⚠️ Could not clean up temporary files:', error.message)
    }
  }

  async extractTextFromPDFWithOCR(buffer, originalName) {
    console.log('🔄 Converting PDF to images for OCR processing...')
    console.log(`📊 PDF buffer size: ${buffer.length} bytes`)
    console.log('🗞️ Optimizing for newspaper article image processing...')

    let extractedText = ''
    const tempPath = this.ensureTempDirectory()
    console.log(`📁 Using temp directory: ${tempPath}`)

    // Try multiple PDF to image conversion approaches
    const approaches = [
      { name: 'PDF-Poppler', method: 'poppler' },
      { name: 'PDF2Pic', method: 'pdf2pic' },
    ]

    for (const approach of approaches) {
      let imagePaths = []
      let tempPdfPath = null
      try {
        console.log(`🔄 Attempting PDF conversion with ${approach.name}...`)

        if (approach.method === 'poppler') {
          // Method 1: Use pdf-poppler (often better for scanned documents)
          tempPdfPath = path.join(tempPath, `temp_${Date.now()}.pdf`)
          fs.writeFileSync(tempPdfPath, buffer)

          const options = {
            format: 'png',
            out_dir: tempPath,
            out_prefix: 'page',
            page: null, // All pages
            resolution_x: 300,
            resolution_y: 300
          }

          console.log('📄 Converting with PDF-Poppler...')
          await pdfPoppler.convert(tempPdfPath, options)

          // Collect generated image paths
          imagePaths = fs.readdirSync(tempPath)
            .filter(file => file.startsWith('page-') && file.endsWith('.png'))
            .sort((a, b) => {
              const pageA = parseInt(a.match(/page-(\d+)/)[1])
              const pageB = parseInt(b.match(/page-(\d+)/)[1])
              return pageA - pageB
            })
            .map(file => path.join(tempPath, file))

          console.log(`✅ PDF-Poppler conversion successful: ${imagePaths.length} pages`)

        } else if (approach.method === 'pdf2pic') {
          // Method 2: Use pdf2pic as fallback
          const convertOptions = {
            density: 300,           // Higher DPI for newspaper text
            format: "png",
            size: "2480x3508",      // A4 at 300 DPI
            savedir: tempPath,
            savename: "page"
          }

          console.log('📄 Converting with PDF2Pic...')
          const convert = pdf2pic.fromBuffer(buffer, convertOptions)
          const pageOutputs = await convert.bulk(-1)

          if (pageOutputs && pageOutputs.length > 0) {
            imagePaths = pageOutputs.map(output => output.path)
            // Sort by page number if necessary
            imagePaths.sort((a, b) => {
              const pageA = parseInt(a.match(/\.(\d+)\./)[1])
              const pageB = parseInt(b.match(/\.(\d+)\./)[1])
              return pageA - pageB
            })
            console.log(`✅ PDF2Pic conversion successful: ${imagePaths.length} pages`)
          }
        }

        if (imagePaths.length > 0) {
          const pageTexts = []
          for (const imagePath of imagePaths) {
            console.log(`🖼️ Processing page: ${imagePath}`)
            const imageBuffer = fs.readFileSync(imagePath)
            const pageText = await this.extractTextFromImage(imageBuffer, 'png')
            pageTexts.push(pageText)
            fs.unlinkSync(imagePath) // Clean up immediately
          }

          extractedText = pageTexts.join('\n\n')
          console.log(`✅ Combined text from ${pageTexts.length} pages: ${extractedText.length} characters`)

          break // Success, exit the loop
        } else {
          console.log(`❌ ${approach.name} conversion failed - no images produced`)
        }

      } catch (error) {
        console.error(`❌ ${approach.name} conversion failed:`, error.message)
      } finally {
        // Clean up temp PDF if created
        if (tempPdfPath && fs.existsSync(tempPdfPath)) {
          fs.unlinkSync(tempPdfPath)
        }
      }
    }

    // Clean up any remaining temporary files
    this.cleanupTempFiles()

    if (extractedText.trim().length > 10) {
      return extractedText.trim()
    } else {
      return `PDF document "${originalName}" was processed with multiple conversion methods but minimal readable text could be extracted. This may be due to poor image quality, complex layouts, or unsupported languages. Extracted: "${extractedText.substring(0, 100)}"`
    }
  }

  async extractTextFromImage(buffer, fileType) {
    try {
      console.log('🖼️ Starting enhanced OCR process...')

      // Enhanced image preprocessing for newspaper text
      let processedBuffers = []

      try {
        console.log('🔧 Advanced preprocessing with Sharp...')

        // Get image metadata for adaptive processing
        const metadata = await sharp(buffer).metadata()
        console.log('📏 Image metadata:', {
          width: metadata.width,
          height: metadata.height,
          density: metadata.density,
          channels: metadata.channels
        })

        // Create multiple processed versions for better OCR results
        const baseImage = sharp(buffer)

        // Version 1: High contrast, denoised
        const version1 = await baseImage
          .clone()
          .resize(null, Math.max(2000, metadata.height * 2), { // Upscale for better OCR
            kernel: sharp.kernel.lanczos3,
            withoutEnlargement: false
          })
          .grayscale()
          .normalize() // Normalize contrast
          .sharpen({ sigma: 1.0, m1: 1.0, m2: 2.0, x1: 2.0, y2: 10.0 })
          .linear(1.2, -(128 * 0.2)) // Increase contrast
          .median(2) // Remove noise
          .png({ quality: 100, compressionLevel: 0 })
          .toBuffer()

        // Version 2: Threshold for high contrast text
        const version2 = await baseImage
          .clone()
          .resize(null, Math.max(2000, metadata.height * 2), {
            kernel: sharp.kernel.lanczos3,
            withoutEnlargement: false
          })
          .grayscale()
          .normalize()
          .linear(2.0, -128) // High contrast
          .threshold(128) // Binary threshold
          .png({ quality: 100, compressionLevel: 0 })
          .toBuffer()

        // Version 3: Enhanced sharpening for scanned text
        const version3 = await baseImage
          .clone()
          .resize(null, Math.max(1800, metadata.height * 1.5), {
            kernel: sharp.kernel.lanczos3,
            withoutEnlargement: false
          })
          .grayscale()
          .normalize() // Normalize histogram
          .sharpen({ sigma: 1.0, m1: 2.0, m2: 1.0, x1: 2.0, y2: 10.0 })
          .gamma(0.8) // Adjust gamma for better text visibility
          .png({ quality: 100, compressionLevel: 0 })
          .toBuffer()

        // Version 4: Telugu-optimized preprocessing
        const version4 = await baseImage
          .clone()
          .resize(null, Math.max(2400, metadata.height * 2.5), { // Higher resolution for complex scripts
            kernel: sharp.kernel.lanczos3,
            withoutEnlargement: false
          })
          .grayscale()
          .normalize()
          .sharpen({ sigma: 0.8, m1: 1.5, m2: 2.5, x1: 1.5, y2: 8.0 }) // Optimized for Telugu curves
          .linear(1.5, -(128 * 0.3)) // Moderate contrast boost
          .median(1) // Light denoising to preserve character details
          .gamma(0.9) // Slight gamma adjustment for Telugu characters
          .png({ quality: 100, compressionLevel: 0 })
          .toBuffer()

        processedBuffers = [
          { buffer: version4, name: 'telugu-optimized' },
          { buffer: version1, name: 'enhanced' },
          { buffer: version2, name: 'threshold' },
          { buffer: version3, name: 'sharpened' },
          { buffer: buffer, name: 'original' }
        ]

        console.log('✅ Created 4 image processing variants')
      } catch (sharpError) {
        console.log('⚠️ Sharp preprocessing failed, using simpler approach:', sharpError.message)

        // Fallback: simpler preprocessing
        try {
          const simpleProcessed = await sharp(buffer)
            .grayscale()
            .normalize()
            .png()
            .toBuffer()

          processedBuffers = [
            { buffer: simpleProcessed, name: 'simple' },
            { buffer: buffer, name: 'original' }
          ]
          console.log('✅ Created 2 simple processing variants')
        } catch (fallbackError) {
          console.log('⚠️ All preprocessing failed, using original only:', fallbackError.message)
          processedBuffers = [{ buffer: buffer, name: 'original' }]
        }
      }

      // Detect primary language from filename or use all languages
      let languages = 'eng+hin+guj+tel' // All four languages
      console.log(`🌐 Using OCR languages: ${languages}`)

      let bestResult = { text: '', confidence: 0 }

      // Try OCR on each processed version
      for (const { buffer: procBuffer, name } of processedBuffers) {
        try {
          console.log(`👁️ Running Tesseract OCR on ${name} version...`)

          // Get or create worker for this language set
          const worker = await this.getOrCreateWorker(languages)

          // Set only parameters that can be changed after initialization
          await worker.setParameters({
            tessedit_char_whitelist: '', // Allow all characters
            tessedit_write_images: '0', // Don't save debug images
            // OCR accuracy improvements that can be set after init
            classify_enable_learning: '1',
            classify_enable_adaptive_matcher: '1',
            textord_really_old_xheight: '1',
            segment_penalty_dict_frequent_word: '1',
            allow_blob_division: '1',
            classify_enable_adaptive_debugger: '0',
            // Telugu-specific improvements
            textord_heavy_nr: '1',
            textord_show_blobs: '0',
            textord_tabfind_show_vlines: '0',
            preserve_interword_spaces: '1',
            user_defined_dpi: '300',
          })

          const { data: { text, confidence } } = await worker.recognize(procBuffer)

          console.log(`📊 OCR Results for ${name}: confidence=${confidence?.toFixed(1)}%, length=${text.trim().length}`)

          // Keep the result with highest confidence or longest meaningful text
          if (confidence > bestResult.confidence ||
            (text.trim().length > bestResult.text.trim().length * 1.5 && confidence > 50)) {
            bestResult = { text: text.trim(), confidence }
            console.log(`🏆 New best result from ${name} version`)
          }

          // If we got very high confidence, no need to try other versions
          if (confidence > 90 && text.trim().length > 100) {
            console.log(`✨ Excellent OCR result achieved, stopping early`)
            break
          }

        } catch (ocrError) {
          console.log(`⚠️ OCR failed on ${name} version:`, ocrError.message)
          continue
        }
      }

      if (!bestResult.text || bestResult.text.length === 0) {
        throw new Error('No text could be extracted from any image processing version')
      }

      console.log(`✅ Best OCR result: confidence=${bestResult.confidence?.toFixed(1)}%, length=${bestResult.text.length}`)

      // Check if we should try Telugu-specific OCR
      const hasTeluguChars = /[\u0C00-\u0C7F]/.test(bestResult.text)
      const hasLowConfidence = bestResult.confidence < 60
      const hasGarbledText = bestResult.text.includes('?') || bestResult.text.includes('□') || bestResult.text.includes('�')
      
      if (!hasTeluguChars && (hasLowConfidence || hasGarbledText)) {
        console.log('🔄 Attempting Telugu-specific OCR retry...')
        try {
          const teluguWorker = await this.getOrCreateWorker('tel')
          const { data: { text: teluguText, confidence: teluguConfidence } } = await teluguWorker.recognize(processedBuffers[0].buffer)
          
          if (teluguConfidence > bestResult.confidence && /[\u0C00-\u0C7F]/.test(teluguText)) {
            console.log(`🎯 Telugu-specific OCR improved results: ${teluguConfidence?.toFixed(1)}% confidence`)
            bestResult = { text: teluguText, confidence: teluguConfidence }
          }
        } catch (teluguError) {
          console.log('⚠️ Telugu-specific OCR failed:', teluguError.message)
        }
      }

      // Post-process the OCR result
      let finalText = this.postProcessOCRText(bestResult.text)

      return finalText

    } catch (error) {
      console.error('❌ Enhanced OCR Error:', error)
      throw new Error(`Failed to extract text from image: ${error.message}`)
    }
  }

  postProcessOCRText(text) {
    console.log('🔧 Post-processing OCR text...')

    // Common OCR error corrections
    let processed = text
      // Fix common character substitutions
      .replace(/[|]/g, 'I') // Pipe to I
      .replace(/[০]/g, '0') // Bengali zero to English zero
      .replace(/[১]/g, '1') // Bengali one to English one
      .replace(/[২]/g, '2') // Bengali two to English two
      .replace(/[৩]/g, '3') // Bengali three to English three
      .replace(/[৪]/g, '4') // Bengali four to English four
      .replace(/[৫]/g, '5') // Bengali five to English five
      .replace(/[৬]/g, '6') // Bengali six to English six
      .replace(/[৭]/g, '7') // Bengali seven to English seven
      .replace(/[৮]/g, '8') // Bengali eight to English eight
      .replace(/[৯]/g, '9') // Bengali nine to English nine
      // Fix spacing issues
      .replace(/([a-zA-Z])([०-९])/g, '$1 $2') // Space between English letters and Devanagari numbers
      .replace(/([०-९])([a-zA-Z])/g, '$1 $2') // Space between Devanagari numbers and English letters
      .replace(/([અ-હ])([0-9])/g, '$1 $2') // Space between Gujarati and English numbers
      .replace(/([0-9])([અ-હ])/g, '$1 $2') // Space between English numbers and Gujarati
      .replace(/([क-ह])([0-9])/g, '$1 $2') // Space between Hindi and English numbers
      .replace(/([0-9])([क-ह])/g, '$1 $2') // Space between English numbers and Hindi
      .replace(/([అ-హ])([0-9])/g, '$1 $2') // Space between Telugu and English numbers
      .replace(/([0-9])([అ-హ])/g, '$1 $2') // Space between English numbers and Telugu
      // Fix line breaks and spacing
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .replace(/[ \t]{2,}/g, ' ') // Remove excessive spaces
      .replace(/([.!?])\s*\n\s*([A-Z\u0900-\u097F\u0A80-\u0AFF])/g, '$1\n\n$2') // Proper paragraph breaks
      // Fix punctuation spacing
      .replace(/([a-zA-Z\u0900-\u097F\u0A80-\u0AFF])([.!?,:;])/g, '$1$2') // Remove space before punctuation
      .replace(/([.!?,:;])([a-zA-Z\u0900-\u097F\u0A80-\u0AFF])/g, '$1 $2') // Add space after punctuation

    // Remove very short lines that are likely OCR artifacts
    const lines = processed.split('\n')
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim()
      // Keep lines that are longer than 3 characters or contain meaningful characters
      return trimmed.length > 3 || /[a-zA-Z\u0900-\u097F\u0A80-\u0AFF]{2,}/.test(trimmed)
    })

    processed = filteredLines.join('\n').trim()

    console.log(`🔧 Post-processing completed: ${text.length} -> ${processed.length} characters`)

    return processed
  }

  // Cleanup method to terminate workers
  async cleanup() {
    console.log('🧹 Cleaning up Tesseract workers...')
    for (const [workerId, worker] of this.workerPool.entries()) {
      try {
        await worker.terminate()
        console.log(`✅ Terminated worker: ${workerId}`)
      } catch (error) {
        console.log(`⚠️ Error terminating worker ${workerId}:`, error.message)
      }
    }
    this.workerPool.clear()
  }

  // Static method for external use
  static detectLanguage(text) {
    const instance = new TextExtractorService()
    return instance.detectLanguage(text)
  }
}

// Create singleton instance
const textExtractorInstance = new TextExtractorService()

// Graceful cleanup on process termination
process.on('SIGINT', async () => {
  console.log('🔄 Received SIGINT, cleaning up...')
  await textExtractorInstance.cleanup()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('🔄 Received SIGTERM, cleaning up...')
  await textExtractorInstance.cleanup()
  process.exit(0)
})

export default textExtractorInstance