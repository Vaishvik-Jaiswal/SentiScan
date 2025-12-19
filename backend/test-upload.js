// Simple test script to debug upload issues
import textExtractor from './services/textExtractor.js'

console.log('🧪 Testing text extraction...')

// Test with a simple text buffer
const testText = 'This is a test article.\nThis is the content of the article.'
const testBuffer = Buffer.from(testText, 'utf-8')

try {
  console.log('📄 Testing TXT extraction...')
  const result = await textExtractor.extractText(testBuffer, 'txt', 'test.txt')
  console.log('✅ Success:', result)
} catch (error) {
  console.error('❌ Error:', error.message)
  console.error('❌ Stack:', error.stack)
}

console.log('🏁 Test completed')
process.exit(0)

