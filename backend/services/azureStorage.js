import { BlobServiceClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } from '@azure/storage-blob'

class AzureStorageService {
  constructor() {
    // Use your actual environment variable names
    this.connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
    this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME
    this.accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY
    this.containerName = process.env.AZURE_CONTAINER_NAME || 'sentiscan-uploads'
    
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
      this.blobServiceClient = null
      this.sharedKeyCredential = null
    }
  }

  async uploadFile(buffer, fileName, contentType) {
    console.log(`☁️ Attempting Azure upload: ${fileName} (${buffer.length} bytes)`)
    
    if (!this.blobServiceClient) {
      console.log('⚠️ Azure Blob Storage not configured')
      throw new Error('Azure Blob Storage not configured')
    }

    try {
      // Get container client
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName)
      console.log(`📁 Using container: ${this.containerName}`)
      
      // Ensure container exists
      await containerClient.createIfNotExists()

      // Generate unique blob name
      const timestamp = Date.now()
      const blobName = `sentiscan/${timestamp}-${fileName}`
      console.log(`📝 Generated blob name: ${blobName}`)
      
      // Get block blob client
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)
      
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
      }

      console.log('⬆️ Starting blob upload...')
      await blockBlobClient.upload(buffer, buffer.length, uploadOptions)
      
      console.log(`✅ File uploaded to Azure Blob Storage: ${blobName}`)
      
      // Generate SAS URL for accessing the file
      console.log('🔗 Generating SAS URL...')
      const sasUrl = this.generateSasUrl(blobName)
      
      const result = {
        blobName,
        url: sasUrl,
        containerName: this.containerName
      }
      
      console.log('✅ Azure upload completed:', { blobName, hasUrl: !!sasUrl })
      return result
    } catch (error) {
      console.error('❌ Error uploading to Azure Blob Storage:', error)
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode
      })
      throw new Error(`Failed to upload file to storage: ${error.message}`)
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
      console.log(`✅ File deleted from Azure Blob Storage: ${blobName}`)
      return true
    } catch (error) {
      console.error('❌ Error deleting from Azure Blob Storage:', error)
      return false
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

  generateSasUrl(blobName, expiresInHours = 24) {
    if (!this.sharedKeyCredential || !this.accountName) {
      console.warn('Cannot generate SAS URL - credentials not available')
      return `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobName}`
    }

    try {
      // Set SAS permissions and expiry
      const sasOptions = {
        containerName: this.containerName,
        blobName: blobName,
        permissions: BlobSASPermissions.parse('r'), // Read permission only
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + expiresInHours * 60 * 60 * 1000) // 24 hours from now
      }

      // Generate SAS token
      const sasToken = generateBlobSASQueryParameters(sasOptions, this.sharedKeyCredential).toString()
      
      // Construct full SAS URL
      const sasUrl = `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobName}?${sasToken}`
      
      return sasUrl
    } catch (error) {
      console.error('❌ Error generating SAS URL:', error)
      return `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobName}`
    }
  }

  // Generate SAS URL for existing blob
  async getSasUrl(blobName, expiresInHours = 24) {
    return this.generateSasUrl(blobName, expiresInHours)
  }

  async getFileUrl(blobName) {
    return this.generateSasUrl(blobName)
  }

  isConfigured() {
    return !!this.blobServiceClient && !!this.sharedKeyCredential
  }
}

export default new AzureStorageService()
