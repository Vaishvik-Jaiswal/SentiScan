import { BlobServiceClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } from '@azure/storage-blob'

class AzureStorageService {
  constructor() {
    this.blobServiceClient = null
    this.sharedKeyCredential = null
    this.connectionString = null
    this.accountName = null
    this.accountKey = null
    this.containerName = null
    this.initialized = false
  }

  initialize() {
    if (this.initialized) {
      return
    }

    // Use your actual environment variable names
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
      this.initialized = true
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
    
    this.initialized = true
  }

  async uploadFile(buffer, fileName, contentType) {
    this.initialize()
    
    console.log(`☁️ Attempting Azure upload: ${fileName} (${buffer.length} bytes)`)
    
    if (!this.blobServiceClient) {
      console.log('⚠️ Azure Blob Storage not configured')
      throw new Error('Azure Blob Storage not configured')
    }

    try {
      // Get container client
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName)
      console.log(`📁 Using container: ${this.containerName}`)
      
      // Ensure container exists (private access, use SAS tokens for access)
      await containerClient.createIfNotExists()

      // Generate unique blob name with better structure
      const timestamp = Date.now()
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
      const blobName = `sentiscan/${timestamp}-${sanitizedFileName}`
      console.log(`📝 Generated blob name: ${blobName}`)
      
      // Get block blob client
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)
      
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: contentType,
          blobContentDisposition: `attachment; filename="${fileName}"`,
        },
        metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
        }
      }

      console.log('⬆️ Starting blob upload...')
      await blockBlobClient.upload(buffer, buffer.length, uploadOptions)
      
      console.log(`✅ File uploaded to Azure Blob Storage: ${blobName}`)
      
      // Generate SAS URL for accessing the file
      console.log('🔗 Generating SAS URL...')
      const sasUrl = await this.generateSasUrl(blobName)
      
      const result = {
        blobName,
        url: sasUrl,
        containerName: this.containerName,
        publicUrl: `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobName}`
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
    this.initialize()
    
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
    this.initialize()
    
    if (!this.blobServiceClient) {
      throw new Error('Azure Blob Storage not configured')
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName)
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)
      
      const downloadResponse = await blockBlobClient.download()
      
      // Convert stream to buffer
      const chunks = []
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk)
      }
      
      return Buffer.concat(chunks)
    } catch (error) {
      console.error('❌ Error downloading file from Azure Blob Storage:', error)
      throw error
    }
  }

  async generateSasUrl(blobName, expiresInHours = 24) {
    this.initialize()
    
    if (!this.sharedKeyCredential || !this.accountName) {
      console.warn('Cannot generate SAS URL - credentials not available')
      return `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobName}`
    }

    try {
      // Verify blob exists first
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName)
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)
      
      const exists = await blockBlobClient.exists()
      if (!exists) {
        throw new Error(`Blob ${blobName} does not exist`)
      }

      // Set SAS permissions and expiry
      const sasOptions = {
        containerName: this.containerName,
        blobName: blobName,
        permissions: BlobSASPermissions.parse('r'), // Read permission only
        startsOn: new Date(Date.now() - 5 * 60 * 1000), // Start 5 minutes ago to account for clock skew
        expiresOn: new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      }

      // Generate SAS token
      const sasToken = generateBlobSASQueryParameters(sasOptions, this.sharedKeyCredential).toString()
      
      // Construct full SAS URL
      const sasUrl = `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobName}?${sasToken}`
      
      console.log(`✅ Generated SAS URL for ${blobName} (expires in ${expiresInHours}h)`)
      return sasUrl
    } catch (error) {
      console.error('❌ Error generating SAS URL:', error)
      // Return public URL as fallback (will work if container has public access)
      return `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobName}`
    }
  }

  // Generate SAS URL for existing blob
  async getSasUrl(blobName, expiresInHours = 24) {
    return await this.generateSasUrl(blobName, expiresInHours)
  }

  async getFileUrl(blobName) {
    return await this.generateSasUrl(blobName)
  }

  async listContainers() {
    this.initialize()
    
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

  async checkBlobExists(blobName) {
    this.initialize()
    
    if (!this.blobServiceClient) {
      return false
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName)
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)
      return await blockBlobClient.exists()
    } catch (error) {
      console.error('❌ Error checking blob existence:', error)
      return false
    }
  }

  isConfigured() {
    this.initialize()
    return !!this.blobServiceClient && !!this.sharedKeyCredential
  }
}

export default new AzureStorageService()
