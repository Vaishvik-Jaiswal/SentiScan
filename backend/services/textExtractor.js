import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import Tesseract from 'tesseract.js'
import sharp from 'sharp'

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

      // Extract heading (first non-empty line or first 100 characters)
      const lines = extractedText.split('\n').filter(line => line.trim().length > 0)
      if (lines.length > 0) {
        heading = lines[0].trim()
        if (heading.length > 100) {
          heading = heading.substring(0, 100) + '...'
        }
      }

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

  detectLanguage(text) {
    // Simple language detection based on character patterns
    const sample = text.substring(0, 500).toLowerCase()
    
    // Check for Hindi (Devanagari script)
    const hindiPattern = /[\u0900-\u097F]/
    // Check for Gujarati script
    const gujaratiPattern = /[\u0A80-\u0AFF]/
    
    const hasHindi = hindiPattern.test(sample)
    const hasGujarati = gujaratiPattern.test(sample)
    const hasEnglish = /[a-z]/.test(sample)

    if (hasHindi && hasGujarati) return 'mixed'
    if (hasHindi && hasEnglish) return 'mixed'
    if (hasGujarati && hasEnglish) return 'mixed'
    if (hasHindi) return 'hindi'
    if (hasGujarati) return 'gujarati'
    if (hasEnglish) return 'english'
    
    return 'unknown'
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
