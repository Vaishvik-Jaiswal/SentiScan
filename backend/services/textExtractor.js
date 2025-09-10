import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import Tesseract from 'tesseract.js'
import sharp from 'sharp'
import sentimentAnalysis from './sentimentAnalysis.js'

// Test imports on startup
console.log('📚 Text extractor service loading...')
console.log('📄 PDF parser available:', typeof pdfParse)
console.log('📝 Mammoth available:', typeof mammoth)
console.log('🖼️ Tesseract OCR available:', typeof Tesseract)
console.log('🖼️ Sharp image processor available:', typeof sharp)

class TextExtractorService {
  async extractText(buffer, fileType, originalName) {
    console.log(`📄 Extracting text from ${fileType} file: ${originalName}`)
    
    try {
      let extractedText = ''
      let heading = ''

      switch (fileType.toLowerCase()) {
        case 'pdf':
          console.log('📄 Processing PDF file...')
          const pdfData = await pdfParse(buffer)
          extractedText = pdfData.text
          console.log(`✅ PDF extracted: ${extractedText.length} characters`)
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
          console.log(`🖼️ Processing ${fileType.toUpperCase()} image file...`)
          extractedText = await this.extractTextFromImage(buffer, fileType)
          console.log(`✅ OCR extracted: ${extractedText.length} characters`)
          break

        default:
          throw new Error(`Unsupported file type: ${fileType}`)
      }

      if (!extractedText || extractedText.trim().length === 0) {
        console.log(`⚠️ No text extracted from ${fileType} file, using filename as content`)
        extractedText = `Content from ${originalName}. This file may be image-based or protected.`
      }
      
      // Handle very short extractions (likely scanned PDFs)
      if (extractedText.trim().length < 10) {
        console.log(`⚠️ Very short text extraction (${extractedText.trim().length} chars), likely scanned PDF`)
        extractedText = `Content from ${originalName}. This appears to be a scanned document or image-based PDF. Original text: "${extractedText.trim()}"`
      }

      // Extract heading using OpenAI
      heading = await this.extractHeadingWithAI(extractedText)

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
    
    // First, detect the language of the article
    const detectedLanguage = this.detectLanguage(text)
    console.log(`🌐 Detected article language: ${detectedLanguage}`)
    
    // Fallback method for when AI is not available
    const fallbackHeading = () => {
      console.log('⚠️ Using fallback heading extraction...')
      const lines = text.split('\n').filter(line => line.trim().length > 0)
      if (lines.length === 0) return 'Untitled'
      
      // OCR-specific patterns to skip
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
        /thehitavada|times of india|hindustan times|indian express|hindu|telegraph/i,
        /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/, // Dates
        /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, // Days
        /^[A-Z][a-z]+,?\s*\d{1,2}/, // Location with date
        /^[A-Z][a-z]+:\s*/, // Location with colon
        /NEW DELHI/i,
        /PTI/i,
        /ANI/i,
        /^[A-Z]+,/i, // City names in all caps followed by comma
      ]
      
      // Try to find a good heading by analyzing more lines
      for (let i = 0; i < Math.min(lines.length, 20); i++) {
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
        
        // For Hindi/Gujarati content, look for Devanagari/Gujarati script
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
          // For English content, look for proper headline structure
          const hasActionWords = /\b(announces?|launches?|wins?|loses?|introduces?|reveals?|confirms?|denies?|reports?|says?|claims?|begins?|ends?|starts?|completes?)\b/i.test(line)
          const hasProperStructure = /^[A-Z].*[a-z].*/.test(line) && line.split(' ').length >= 3
          
          if (hasActionWords || hasProperStructure) {
            const heading = line.length > 100 ? line.substring(0, 100) + '...' : line
            console.log(`✅ Fallback found English heading: "${heading}"`)
            return heading
          }
        }
      }
      
      // Last resort: use first non-skipped line
      for (let i = 0; i < Math.min(lines.length, 20); i++) {
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
      
      // Absolute last resort: use first line but warn
      const lastResort = lines[0].trim()
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
- Look for Gujarati text that appears to be a headline
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
   - Newspaper names like "TheHitavada", "Times of India", etc.
   - Section headers like "SPORTS", "POLITICS", "BREAKING NEWS"
   - Bylines like "By Our Staff Reporter"
   - Any text containing "PTI", "ANI" or news agency abbreviations
   - Page numbers, dates, or location headers

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

Input: "Main Paper | 2025-00406 | Page 3\nભારત સરકાર દ્વારા નવી શિક્ષણ નીતિ જાહેર\nગુજરાત રાજ્યમાં..."
Output: ભારત સરકાર દ્વારા નવી શિક્ષણ નીતિ જાહેર

REMEMBER: Extract ONLY the main headline in the SAME LANGUAGE as the article content.`
      }

      const userPrompt = {
        role: 'user',
        content: `Extract ONLY the main headline from this newspaper article text. Return it in the ORIGINAL LANGUAGE (${detectedLanguage}):\n\n${textSample}`
      }

      console.log('📤 Sending heading extraction request to Azure OpenAI...')
      console.log('📝 Text sample (first 200 chars):', textSample.substring(0, 200) + '...')
      
      // Make sure to use the correct endpoint and API key
      const response = await openaiClient.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT,
        messages: [systemPrompt, userPrompt],
        temperature: 0.1,
        max_tokens: 200, // Increased for longer headlines in non-Latin scripts
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
      
      // Check for invalid patterns
      const invalidPatterns = [
        /NEW DELHI,?\s+[A-Za-z]+\s+\d+\s*\([A-Z]+\)/i, // "NEW DELHI, Sept 5 (PTI)"
        /page[-\s]*\d+/i,
        /\d{4}[-\s]*\d+/i, // Issue numbers
        /main paper/i,
        /^[A-Z]+,/i, // City names in all caps followed by comma
        /\(PTI\)|\(ANI\)/i,
      ]
      
      const isInvalidHeading = invalidPatterns.some(pattern => pattern.test(heading))
      
      if (isInvalidHeading) {
        console.log('⚠️ AI returned invalid heading (metadata), using fallback')
        return fallbackHeading()
      }
      
      // Check if language matches expected language
      const hasDevanagari = /[\u0900-\u097F]/.test(heading)
      const hasGujarati = /[\u0A80-\u0AFF]/.test(heading)
      const hasLatin = /[a-zA-Z]/.test(heading)
      
      if (detectedLanguage === 'hindi' && !hasDevanagari) {
        console.log('⚠️ Expected Hindi heading but got non-Devanagari script, using fallback')
        return fallbackHeading()
      }
      
      if (detectedLanguage === 'gujarati' && !hasGujarati) {
        console.log('⚠️ Expected Gujarati heading but got non-Gujarati script, using fallback')
        return fallbackHeading()
      }
      
      if (detectedLanguage === 'english' && (!hasLatin || hasDevanagari || hasGujarati)) {
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
    const sample = text.substring(0, 2000).toLowerCase()
    
    // Check for Hindi (Devanagari script)
    const hindiPattern = /[\u0900-\u097F]/g
    // Check for Gujarati script
    const gujaratiPattern = /[\u0A80-\u0AFF]/g
    // Check for English - only count letters, not numbers or punctuation
    const englishPattern = /[a-z]/g
    
    const hindiMatches = (sample.match(hindiPattern) || []).length
    const gujaratiMatches = (sample.match(gujaratiPattern) || []).length
    const englishMatches = (sample.match(englishPattern) || []).length
    
    const total = hindiMatches + gujaratiMatches + englishMatches
    
    console.log(`📊 Language detection results:`, {
      hindi: hindiMatches,
      gujarati: gujaratiMatches,
      english: englishMatches,
      total: total
    })
    
    if (total === 0) {
      return 'unknown'
    }
    
    // Calculate percentages
    const hindiPercent = (hindiMatches / total) * 100
    const gujaratiPercent = (gujaratiMatches / total) * 100
    const englishPercent = (englishMatches / total) * 100
    
    console.log(`📊 Language percentages:`, {
      hindi: `${hindiPercent.toFixed(1)}%`,
      gujarati: `${gujaratiPercent.toFixed(1)}%`,
      english: `${englishPercent.toFixed(1)}%`
    })
    
    // Determine dominant language with a lower threshold (40% for non-Latin scripts)
    // This is because Hindi/Gujarati often have fewer characters but more visual weight
    const nonLatinThreshold = 40
    const latinThreshold = 60
    
    if (hindiPercent >= nonLatinThreshold && hindiPercent > gujaratiPercent && hindiPercent > englishPercent) {
      console.log(`✅ Detected language: Hindi (${hindiPercent.toFixed(1)}%)`)
      return 'hindi'
    }
    
    if (gujaratiPercent >= nonLatinThreshold && gujaratiPercent > hindiPercent && gujaratiPercent > englishPercent) {
      console.log(`✅ Detected language: Gujarati (${gujaratiPercent.toFixed(1)}%)`)
      return 'gujarati'
    }
    
    if (englishPercent >= latinThreshold) {
      console.log(`✅ Detected language: English (${englishPercent.toFixed(1)}%)`)
      return 'english'
    }
    
    // If no clear winner, use the highest percentage
    const maxPercent = Math.max(hindiPercent, gujaratiPercent, englishPercent)
    
    if (maxPercent === hindiPercent) {
      console.log(`✅ Detected primary language: Hindi (${hindiPercent.toFixed(1)}%)`)
      return 'hindi'
    }
    if (maxPercent === gujaratiPercent) {
      console.log(`✅ Detected primary language: Gujarati (${gujaratiPercent.toFixed(1)}%)`)
      return 'gujarati'
    }
    if (maxPercent === englishPercent) {
      console.log(`✅ Detected primary language: English (${englishPercent.toFixed(1)}%)`)
      return 'english'
    }
    
    // Should never reach here, but just in case
    console.log(`⚠️ Could not determine language, defaulting to English`)
    return 'english'
  }

  async extractTextFromImage(buffer, fileType) {
    try {
      console.log('🖼️ Starting OCR process...')
      
      // Preprocess image for better OCR results
      let processedBuffer = buffer
      
      try {
        console.log('🔧 Preprocessing image with Sharp...')
        processedBuffer = await sharp(buffer)
          .grayscale() // Convert to grayscale for better OCR
          .normalize() // Normalize contrast
          .sharpen() // Sharpen for better text recognition
          .png() // Convert to PNG for Tesseract
          .toBuffer()
        console.log('✅ Image preprocessing completed')
      } catch (sharpError) {
        console.log('⚠️ Sharp preprocessing failed, using original image:', sharpError.message)
        processedBuffer = buffer
      }

      // Perform OCR using Tesseract
      console.log('👁️ Running Tesseract OCR...')
      const { data: { text } } = await Tesseract.recognize(
        processedBuffer,
        'eng+hin', // English and Hindi languages
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`📊 OCR Progress: ${Math.round(m.progress * 100)}%`)
            }
          }
        }
      )

      console.log('✅ OCR completed successfully')
      return text.trim()
    } catch (error) {
      console.error('❌ OCR Error:', error)
      throw new Error(`Failed to extract text from image: ${error.message}`)
    }
  }

  // Static method for external use
  static detectLanguage(text) {
    const instance = new TextExtractorService()
    return instance.detectLanguage(text)
  }
}

export default new TextExtractorService()
