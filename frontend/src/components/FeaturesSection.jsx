import { 
  FileText, 
  Globe, 
  Brain, 
  BarChart3, 
  Upload, 
  TrendingUp,
  Shield,
  Zap,
  Cloud,
  Languages
} from 'lucide-react'

export default function FeaturesSection({ 
  title = "Powerful Features", 
  subtitle = "Everything you need to analyze sentiment across multiple languages and document formats",
  variant = "default" // "default", "compact", "detailed"
}) {
  const features = [
    {
      icon: <FileText className="h-8 w-8 text-blue-600" />,
      title: 'Multi-Format Support',
      description: 'Upload PDF, DOCX, TXT files, and images with automatic text extraction and processing.',
      details: 'Support for PDF, DOCX, TXT, JPG, PNG, GIF, BMP, and WebP formats with OCR capabilities'
    },
    {
      icon: <Languages className="h-8 w-8 text-green-600" />,
      title: 'Multilingual Analysis',
      description: 'Supports sentiment analysis in English, Hindi, Gujarati, and Telugu languages.',
      details: 'Native language support with automatic detection and culturally-aware sentiment analysis'
    },
    {
      icon: <Brain className="h-8 w-8 text-purple-600" />,
      title: 'AI-Powered Analysis',
      description: 'Uses Azure OpenAI to classify sentiment as Positive, Negative, or Neutral.',
      details: 'Advanced GPT models provide nuanced understanding of context, sarcasm, and complex emotions'
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-orange-600" />,
      title: 'Rich Analytics',
      description: 'Interactive charts showing sentiment distribution, trends, and language breakdown.',
      details: 'Comprehensive dashboards with exportable reports and real-time insights'
    },
    {
      icon: <Cloud className="h-8 w-8 text-teal-600" />,
      title: 'Secure Cloud Storage',
      description: 'Files are securely stored in Azure Blob Storage with metadata tracking.',
      details: 'Enterprise-grade security with encryption at rest and in transit, GDPR compliant'
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-red-600" />,
      title: 'Real-time Processing',
      description: 'Background processing with real-time status updates and notifications.',
      details: 'Asynchronous processing with WebSocket updates and email notifications'
    }
  ]

  if (variant === "compact") {
    return (
      <div className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {title}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {subtitle}
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="mb-3">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (variant === "detailed") {
    return (
      <div className="py-24 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {title}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {subtitle}
            </p>
          </div>
          
          <div className="space-y-16">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`flex flex-col lg:flex-row items-center gap-12 ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center mb-6">
                    <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg mr-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                    {feature.description}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    {feature.details}
                  </p>
                </div>
                <div className="flex-1">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 p-8 rounded-2xl">
                    <div className="text-6xl mb-4">
                      {feature.icon}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Feature {index + 1} of {features.length}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className="py-24 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {title}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 stagger-animation">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-700 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 card-hover"
            >
              <div className="mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

