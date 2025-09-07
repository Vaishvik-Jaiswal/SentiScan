import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

class TextExtractorService {
  async extractText(buffer, fileType, originalName) {
    try {
      let extractedText = ''
      let heading = ''

      switch (fileType.toLowerCase()) {
        case 'pdf':
          const pdfData = await pdfParse(buffer)
          extractedText = pdfData.text
          break

        case 'docx':
          const docxResult = await mammoth.extractRawText({ buffer })
          extractedText = docxResult.value
          break

        case 'txt':
          extractedText = buffer.toString('utf-8')
          break

        default:
          throw new Error(`Unsupported file type: ${fileType}`)
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

      return {
        heading: heading || 'Untitled',
        content: extractedText,
        detectedLanguage: this.detectLanguage(extractedText),
      }
    } catch (error) {
      console.error('Error extracting text:', error)
      throw new Error(`Failed to extract text from ${fileType} file`)
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
}

export default new TextExtractorService()
