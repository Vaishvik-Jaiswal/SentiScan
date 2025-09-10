import dotenv from 'dotenv'

// Load environment variables FIRST
dotenv.config()

// Import the class, not the instance
import { BlobServiceClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } from '@azure/storage-blob'

class TestAzureStorageService {
  constructor() {
    this.connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
    this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME
    this.accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY
    this.containerName = process.env.AZURE_CONTAINER_NAME || 'sentiscan-uploads'
    
    console.log('🔧 Initializing Azure Storage with:')
    console.log('- Connection String:', this.connectionString ? 'Set' : 'Missing')
    console.log('- Account Name:', this.accountName ? 'Set' : 'Missing')
    console.log('- Account Key:', this.accountKey ? 'Set' : 'Missing')
    console.log('- Container Name:', this.containerName)
    
    if (!this.connectionString || !this.accountName || !this.accountKey) {
      console.warn('Azure Storage credentials not found. File upload will be limited.')
      this.blobServiceClient = null
      this.sharedKeyCredential = null
      return
    }

    try {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(this.connectionString)
      this.sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey)
      console.log('✅ Azure Blob Storage service initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize Azure Blob Storage:', error)
      console.error('Error details:', error.message)
      this.blobServiceClient = null
      this.sharedKeyCredential = null
    }
  }

  isConfigured() {
    return !!this.blobServiceClient && !!this.sharedKeyCredential
  }

  async listContainers() {
    if (!this.blobServiceClient) {
      throw new Error('Azure Blob Storage not configured')
    }

    try {
      const containers = []
      for await (const container of this.blobServiceClient.listContainers()) {
        containers.push(container.name)
      }
      return containers
    } catch (error) {
      console.error('❌ Error listing containers:', error)
      throw error
    }
  }

  async uploadFile(buffer, fileName, contentType) {
    if (!this.blobServiceClient) {
      throw new Error('Azure Blob Storage not configured')
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName)
      await containerClient.createIfNotExists()

      const timestamp = Date.now()
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
      const blobName = `sentiscan/${timestamp}-${sanitizedFileName}`
      
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)
      
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: contentType,
          blobContentDisposition: `attachment; filename="${fileName}"`,
        }
      }

      await blockBlobClient.upload(buffer, buffer.length, uploadOptions)
      
      const sasUrl = await this.generateSasUrl(blobName)
      
      return {
        blobName,
        url: sasUrl,
        containerName: this.containerName
      }
    } catch (error) {
      console.error('❌ Error uploading to Azure Blob Storage:', error)
      throw new Error(`Failed to upload file to storage: ${error.message}`)
    }
  }

  async generateSasUrl(blobName, expiresInHours = 24) {
    if (!this.sharedKeyCredential || !this.accountName) {
      return `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobName}`
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName)
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)
      
      const exists = await blockBlobClient.exists()
      if (!exists) {
        throw new Error(`Blob ${blobName} does not exist`)
      }

      const sasOptions = {
        containerName: this.containerName,
        blobName: blobName,
        permissions: BlobSASPermissions.parse('r'),
        startsOn: new Date(Date.now() - 5 * 60 * 1000),
        expiresOn: new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      }

      const sasToken = generateBlobSASQueryParameters(sasOptions, this.sharedKeyCredential).toString()
      const sasUrl = `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobName}?${sasToken}`
      
      return sasUrl
    } catch (error) {
      console.error('❌ Error generating SAS URL:', error)
      return `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobName}`
    }
  }

  async downloadFile(blobName) {
    if (!this.blobServiceClient) {
      throw new Error('Azure Blob Storage not configured')
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName)
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)
      
      const downloadResponse = await blockBlobClient.download()
      return downloadResponse.readableStreamBody
    } catch (error) {
      console.error('❌ Error downloading file from Azure Blob Storage:', error)
      throw error
    }
  }

  async deleteFile(blobName) {
    if (!this.blobServiceClient) {
      throw new Error('Azure Blob Storage not configured')
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName)
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)
      
      await blockBlobClient.deleteIfExists()
      return true
    } catch (error) {
      console.error('❌ Error deleting from Azure Blob Storage:', error)
      return false
    }
  }
}

const azureStorage = new TestAzureStorageService()

async function testAzureStorage() {
  console.log('🧪 Testing Azure Storage Configuration...')
  
  // Check if Azure Storage is configured
  console.log('📋 Configuration check:')
  console.log('- Connection String:', process.env.AZURE_STORAGE_CONNECTION_STRING ? '✅ Set' : '❌ Missing')
  console.log('- Account Name:', process.env.AZURE_STORAGE_ACCOUNT_NAME ? '✅ Set' : '❌ Missing')
  console.log('- Account Key:', process.env.AZURE_STORAGE_ACCOUNT_KEY ? '✅ Set' : '❌ Missing')
  console.log('- Container Name:', process.env.AZURE_CONTAINER_NAME || 'sentiscan-uploads (default)')
  
  console.log('\n🔧 Service status:')
  console.log('- Is Configured:', azureStorage.isConfigured())
  
  if (!azureStorage.isConfigured()) {
    console.log('❌ Azure Storage is not properly configured')
    return
  }
  
  try {
    // List available containers
    console.log('\n📁 Available containers:')
    const containers = await azureStorage.listContainers()
    containers.forEach(container => {
      console.log(`  - ${container}`)
    })
    
    if (!containers.includes(process.env.AZURE_CONTAINER_NAME || 'sentiscan-uploads')) {
      console.log(`⚠️ Target container "${process.env.AZURE_CONTAINER_NAME || 'sentiscan-uploads'}" not found in available containers`)
    }
  } catch (error) {
    console.log('❌ Could not list containers:', error.message)
  }
  
  try {
    // Test upload
    console.log('\n⬆️ Testing file upload...')
    const testContent = 'Hello Azure! This is a test file.'
    const testBuffer = Buffer.from(testContent, 'utf8')
    
    const uploadResult = await azureStorage.uploadFile(testBuffer, 'test-file.txt', 'text/plain')
    console.log('✅ Upload successful:', uploadResult)
    
    // Test SAS URL generation
    console.log('\n🔗 Testing SAS URL generation...')
    const sasUrl = await azureStorage.generateSasUrl(uploadResult.blobName)
    console.log('✅ SAS URL generated:', sasUrl.substring(0, 100) + '...')
    
    // Test download
    console.log('\n⬇️ Testing file download...')
    const downloadStream = await azureStorage.downloadFile(uploadResult.blobName)
    console.log('✅ Download stream created successfully')
    
    // Clean up - delete test file
    console.log('\n🗑️ Cleaning up test file...')
    const deleteResult = await azureStorage.deleteFile(uploadResult.blobName)
    console.log('✅ Test file deleted:', deleteResult)
    
    console.log('\n🎉 All Azure Storage tests passed!')
    
  } catch (error) {
    console.error('❌ Azure Storage test failed:', error)
    console.error('Error details:', error.message)
  }
}

// Run the test
testAzureStorage().catch(console.error)