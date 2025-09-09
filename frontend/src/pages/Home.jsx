import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FileText, TrendingUp, Globe, Brain, Upload, BarChart3 } from 'lucide-react'

export default function Home() {
  const { user } = useAuth()

  const features = [
    {
      icon: <FileText className="h-8 w-8 text-blue-600" />,
      title: 'Multi-Format Support',
      description: 'Upload PDF, DOCX, and TXT files with automatic text extraction and processing.'
    },
    {
      icon: <Globe className="h-8 w-8 text-green-600" />,
      title: 'Multilingual Analysis',
      description: 'Supports sentiment analysis in English, Hindi, and Gujarati languages.'
    },
    {
      icon: <Brain className="h-8 w-8 text-purple-600" />,
      title: 'AI-Powered Analysis',
      description: 'Uses Azure OpenAI to classify sentiment as Positive, Negative, Neutral, or Mixed.'
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-orange-600" />,
      title: 'Rich Analytics',
      description: 'Interactive charts showing sentiment distribution, trends, and language breakdown.'
    },
    {
      icon: <Upload className="h-8 w-8 text-teal-600" />,
      title: 'Secure Storage',
      description: 'Files are securely stored in Azure Blob Storage with metadata tracking.'
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-red-600" />,
      title: 'Real-time Processing',
      description: 'Background processing with real-time status updates and notifications.'
    }
  ]

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-teal-600 text-white">
        <div className="container mx-auto px-4 py-24">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-6xl font-extrabold mb-6">
              SentiScan
            </h1>
            <p className="text-xl mb-8 opacity-90">
              AI-Powered Multilingual Sentiment Analysis Platform
            </p>
            <p className="text-lg mb-12 opacity-80">
              Upload your documents and get instant sentiment analysis powered by Azure OpenAI. 
              Supports English, Hindi, and Gujarati languages with beautiful analytics dashboards.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
                  >
                    <BarChart3 className="h-5 w-5 mr-2" />
                    View Dashboard
                  </Link>
                  <Link
                    to="/upload"
                    className="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition-colors"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Upload Article
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition-colors"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Everything you need to analyze sentiment across multiple languages and document formats
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-700 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
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

      {/* How It Works Section */}
      <div className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Simple 4-step process to analyze your documents
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '1',
                title: 'Upload Document',
                description: 'Upload your PDF, DOCX, or TXT file to our secure platform',
                icon: <Upload className="h-8 w-8" />
              },
              {
                step: '2',
                title: 'Text Extraction',
                description: 'Our system extracts text and detects the language automatically',
                icon: <FileText className="h-8 w-8" />
              },
              {
                step: '3',
                title: 'AI Analysis',
                description: 'Azure OpenAI analyzes sentiment for both heading and content',
                icon: <Brain className="h-8 w-8" />
              },
              {
                step: '4',
                title: 'View Results',
                description: 'Access detailed analytics and visualizations in your dashboard',
                icon: <BarChart3 className="h-8 w-8" />
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full mb-4">
                  {item.icon}
                </div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                  Step {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-blue-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Start Analyzing?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who trust SentiScan for their sentiment analysis needs.
            Get started today and unlock insights from your documents.
          </p>
          
          {!user && (
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg shadow-lg hover:bg-gray-100 transition-colors text-lg"
            >
              Create Free Account
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}