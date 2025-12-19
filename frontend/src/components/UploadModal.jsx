import { RefreshCw, FileText, Upload, CheckCircle } from 'lucide-react'

const UploadModal = ({ isOpen, fileName, fileSize }) => {
  if (!isOpen) return null

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Animated Upload Icon */}
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto">
              <Upload className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <RefreshCw className="h-4 w-4 text-white animate-spin" />
            </div>
          </div>

          {/* Upload Status */}
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Uploading Newspaper
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please wait while we upload and prepare your newspaper for analysis
          </p>

          {/* File Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <FileText className="h-5 w-5 text-gray-500 mr-2" />
              <span className="font-medium text-gray-900 dark:text-white">
                {fileName}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Size: {formatFileSize(fileSize)}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="space-y-3">
            <div className="flex items-center text-left">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                File validated and ready for upload
              </span>
            </div>
            <div className="flex items-center text-left">
              <RefreshCw className="h-5 w-5 text-blue-500 animate-spin mr-3 flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Uploading to secure server...
              </span>
            </div>
            <div className="flex items-center text-left opacity-50">
              <div className="h-5 w-5 border-2 border-gray-300 rounded-full mr-3 flex-shrink-0"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Starting AI analysis pipeline
              </span>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              💡 Tip: You'll be redirected to the analysis page where you can track detailed progress
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadModal