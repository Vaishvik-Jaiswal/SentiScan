import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function testUploadEndpoint() {
  console.log('🧪 Testing Azure Storage service integration...')
  
  try {
    // Import the Azure Storage service
    const azureStorage = (await import('./services/azureStorage.js')).default
    
    console.log('🔧 Testing Azure Storage service...')
    console.log('- Is Configured:', azureStorage.isConfigured())
    
    if (!azureStorage.isConfigured()) {
      console.log('❌ Azure Storage is not configured')
      return
    }
    
    // Test upload
    const testContent = 'Hello Azure! This is a test file from the upload endpoint test.'
    const testBuffer = Buffer.from(testContent, 'utf8')
    
    console.log('⬆️ Testing file upload...')
    const uploadResult = await azureStorage.uploadFile(testBuffer, 'test-upload-endpoint.txt', 'text/plain')
    console.log('✅ Upload successful:', uploadResult)
    
    // Test download URL generation
    console.log('🔗 Testing download URL generation...')
    const downloadUrl = await azureStorage.generateSasUrl(uploadResult.blobName, 1) // 1 hour
    console.log('✅ Download URL generated:', downloadUrl.substring(0, 100) + '...')
    
    // Test blob existence
    console.log('🔍 Testing blob existence check...')
    const exists = await azureStorage.checkBlobExists(uploadResult.blobName)
    console.log('✅ Blob exists:', exists)
    
    // Clean up
    console.log('🗑️ Cleaning up test file...')
    const deleteResult = await azureStorage.deleteFile(uploadResult.blobName)
    console.log('✅ Test file deleted:', deleteResult)
    
    console.log('\n🎉 All upload endpoint tests passed!')
    
  } catch (error) {
    console.error('❌ Upload endpoint test failed:', error)
    console.error('Error details:', error.message)
  }
}

// Run the test
testUploadEndpoint().catch(console.error)