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
    if (!this.blobServiceClient) {
      throw new Error('Azure Blob Storage not configured')
    }

    try {
      // Get container client
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName)
      
      // Ensure container exists
      await containerClient.createIfNotExists()

      // Generate unique blob name
      const timestamp = Date.now()
      const blobName = `sentiscan/${timestamp}-${fileName}`
      
      // Get block blob client
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)
      
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
      }

      await blockBlobClient.upload(buffer, buffer.length, uploadOptions)
      
      console.log(`✅ File uploaded to Azure Blob Storage: ${blobName}`)
      
      // Generate SAS URL for accessing the file
      const sasUrl = this.generateSasUrl(blobName)
      
      return {
        blobName,
        url: sasUrl,
        containerName: this.containerName
      }
    } catch (error) {
      console.error('❌ Error uploading to Azure Blob Storage:', error)
      throw new Error('Failed to upload file to storage')
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
