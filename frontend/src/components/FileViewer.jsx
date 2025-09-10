import { useState, useEffect } from 'react'
import { Download, Eye, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import axios from 'axios'

const FileViewer = ({ article, className = "" }) => {
  const [fileUrl, setFileUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Helper function to format file sizes
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Handle file download using direct SAS URL
  const handleDownloadFile = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Please log in to download the file')
        return
      }

      console.log(`🔗 Getting download URL for article: ${article._id}`)

      // Get the direct download URL
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/articles/${article._id}/download-url`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      )

      const { downloadUrl, filename, isDirectUrl } = response.data

      if (isDirectUrl) {
        // For direct URLs (SAS URLs), open in new tab or download directly
        console.log(`✅ Got direct download URL, opening...`)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = filename
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Download started')
      } else {
        // For data URLs, create download link
        console.log(`✅ Got data URL, creating download...`)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Download started')
      }

    } catch (error) {
      console.error('Error downloading file:', error)
      toast.error('Failed to download file')
    }
  }

  // Handle file view/download with proper authentication (fallback method)
  const handleViewFile = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Please log in to view the file')
        return
      }

      console.log(`🔗 Opening file in new tab: ${article._id}`)

      // Fetch the file with authentication and open in new tab
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/articles/${article._id}/file`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          responseType: 'blob'
        }
      )

      // Create a blob URL and open in new tab
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] || 'application/octet-stream' 
      })
      const url = URL.createObjectURL(blob)
      
      // Open in new tab
      const newWindow = window.open(url, '_blank')
      if (!newWindow) {
        // If popup was blocked, create a download link
        const link = document.createElement('a')
        link.href = url
        link.download = article.originalName || `file.${article.fileType}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('File download started')
      }

      // Clean up the blob URL after a short delay
      setTimeout(() => URL.revokeObjectURL(url), 1000)

    } catch (error) {
      console.error('Error viewing file:', error)
      toast.error('Failed to open file')
    }
  }

  useEffect(() => {
    if (article?._id) {
      generateFileUrl()
    } else {
      setError('No file available for viewing')
      setLoading(false)
    }

    // Cleanup blob URLs on unmount to prevent memory leaks
    return () => {
      if (fileUrl && fileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fileUrl)
      }
    }
  }, [article, fileUrl])

  const generateFileUrl = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Authentication required')
        setLoading(false)
        return
      }

      const fileType = article.fileType?.toLowerCase()
      
      // Always fetch the file content first
      try {
        console.log(`🔄 Fetching file: ${article._id}, type: ${fileType}`)
        
        // Use responseType: 'blob' for all file types
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/articles/${article._id}/file`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            responseType: 'blob'
          }
        )
        
        console.log(`✅ Received response:`, {
          status: response.status,
          contentType: response.headers['content-type'],
          size: response.data.size
        })
        
        // Check if we received OCR text content instead of the original file
        const contentType = response.headers['content-type'] || 'application/octet-stream'
        
        if (contentType.includes('text/plain') && article.fileType !== 'txt') {
          // We got OCR text instead of the original file
          console.log(`ℹ️ Received OCR text instead of original ${fileType} file`)
          
          // Read the blob as text
          const reader = new FileReader()
          reader.onload = (e) => {
            const textContent = e.target.result
            
            // Create a blob URL for the text content
            const textBlob = new Blob([textContent], { type: 'text/plain' })
            const url = URL.createObjectURL(textBlob)
            
            setFileUrl(url)
            setLoading(false)
          }
          reader.onerror = (e) => {
            console.error('Error reading blob as text:', e)
            setError('Failed to read OCR content')
            setLoading(false)
          }
          reader.readAsText(response.data)
          return
        }
        
        // For normal file responses
        const blob = new Blob([response.data], { type: contentType })
        const url = URL.createObjectURL(blob)
        
        console.log(`📎 Created blob URL: ${url.substring(0, 50)}...`)
        
        setFileUrl(url)
        setLoading(false)
      } catch (fetchError) {
        console.error('Error fetching file:', fetchError)
        console.error('Error details:', {
          status: fetchError.response?.status,
          statusText: fetchError.response?.statusText,
          data: fetchError.response?.data
        })
        
        if (fetchError.response?.status === 404) {
          // Try to display article content directly if file not found
          if (article.content) {
            console.log(`ℹ️ File not found, using article.content directly`)
            const blob = new Blob([article.content], { type: 'text/plain' })
            const url = URL.createObjectURL(blob)
            setFileUrl(url)
            setLoading(false)
            return
          }
          
          setError('File not found - displaying OCR content instead')
        } else if (fetchError.response?.status === 401) {
          setError('Authentication failed - please log in again')
        } else {
          setError('Failed to load file - displaying OCR content instead')
        }
        
        // If we have article content, use it as fallback
        if (article.content) {
          console.log(`ℹ️ Using article.content as fallback`)
          const blob = new Blob([article.content], { type: 'text/plain' })
          const url = URL.createObjectURL(blob)
          setFileUrl(url)
          setLoading(false)
          return
        }
        
        setLoading(false)
      }
    } catch (err) {
      console.error('Error generating file URL:', err)
      setError('Failed to load file')
      setLoading(false)
    }
  }

  const getFileIcon = (fileType) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-600" />
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
        return <ImageIcon className="h-8 w-8 text-green-600" />
      case 'docx':
        return <FileText className="h-8 w-8 text-blue-600" />
      case 'txt':
        return <FileText className="h-8 w-8 text-gray-600" />
      default:
        return <FileText className="h-8 w-8 text-gray-600" />
    }
  }

  const renderFileViewer = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
          <AlertCircle className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
            File Preview Unavailable
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">{error}</p>
          <div className="flex items-center space-x-2 text-gray-500 mb-4">
            {getFileIcon(article?.fileType)}
            <span className="font-medium">{article?.originalName || 'Unknown file'}</span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
            <p><strong>File Type:</strong> {article?.fileType?.toUpperCase() || 'Unknown'}</p>
            <p><strong>Upload Date:</strong> {article?.createdAt ? new Date(article.createdAt).toLocaleDateString() : 'Unknown'}</p>
            {article?.fileSize && <p><strong>Size:</strong> {formatFileSize(article.fileSize)}</p>}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleDownloadFile}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download File</span>
            </button>
            <button
              onClick={handleViewFile}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span>View</span>
            </button>
          </div>
        </div>
      )
    }

    const fileType = article?.fileType?.toLowerCase()

    // Handle different file types
    switch (fileType) {
      case 'pdf':
        return (
          <div className="h-full min-h-[400px]">
            <iframe
              src={fileUrl}
              className="w-full h-full border-0 rounded-lg"
              title="PDF Viewer"
            />
          </div>
        )

      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
        return (
          <div className="h-full min-h-[400px] flex items-center justify-center">
            <img
              src={fileUrl}
              alt={article?.originalName || 'Uploaded image'}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              onError={(e) => {
                console.error('Image load error:', e)
                console.error('Failed image URL:', fileUrl)
                setError('Failed to load image - the image file may be corrupted or not accessible')
              }}
              onLoad={() => {
                console.log('Image loaded successfully')
              }}
            />
          </div>
        )

      case 'txt':
        return (
          <div className="h-full min-h-[400px] p-4 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-auto">
            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
              {article?.content || 'Loading content...'}
            </pre>
          </div>
        )

      case 'docx':
        return (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center">
            <FileText className="h-16 w-16 text-blue-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              DOCX files cannot be displayed directly in the browser
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              The extracted text content is shown in the adjacent panel
            </p>
            <button
              onClick={handleDownloadFile}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download Original File</span>
            </button>
          </div>
        )

      default:
        return (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center">
            {getFileIcon(fileType)}
            <p className="text-gray-600 dark:text-gray-400 mt-4 mb-2">
              {article?.originalName || 'Unknown file'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              File type: {fileType?.toUpperCase() || 'Unknown'}
            </p>
            <button
              onClick={handleDownloadFile}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download File</span>
            </button>
          </div>
        )
    }
  }

  // return (
  //   <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}>
  //     <div className="p-4 border-b border-gray-200 dark:border-gray-700">
  //       <div className="flex items-center justify-between">
  //         <div className="flex items-center space-x-3">
  //           {getFileIcon(article?.fileType)}
  //           <div>
  //             <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
  //               Original File
  //             </h3>
  //             <p className="text-sm text-gray-600 dark:text-gray-400">
  //               {article?.originalName} ({article?.fileType?.toUpperCase()})
  //             </p>
  //           </div>
  //         </div>
  //         <div className="flex items-center space-x-4">
  //           <div className="flex items-center space-x-2">
  //             <Eye className="h-4 w-4 text-gray-400" />
  //             <span className="text-sm text-gray-500">Preview</span>
  //           </div>
  //           <div className="flex space-x-2">
  //             <button
  //               onClick={handleDownloadFile}
  //               className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
  //             >
  //               <Download className="h-3 w-3" />
  //               <span>Download</span>
  //             </button>
  //             <button
  //               onClick={handleViewFile}
  //               className="inline-flex items-center space-x-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
  //             >
  //               <Eye className="h-3 w-3" />
  //               <span>View</span>
  //             </button>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //     <div className="p-4">
  //       {renderFileViewer()}
  //     </div>
  //   </div>
  // )
}

export default FileViewer
