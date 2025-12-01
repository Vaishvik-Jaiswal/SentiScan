import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FileText, TrendingUp, Globe, Brain, Upload, BarChart3, CheckCircle, Sparkles, Zap, Shield, ArrowRight, Play } from 'lucide-react'

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
      description: 'Supports sentiment analysis in English, Hindi, Gujarati, and Telugu languages.'
    },
    {
      icon: <Brain className="h-8 w-8 text-purple-600" />,
      title: 'AI-Powered Analysis',
      description: 'Uses AI to classify sentiment as Positive, Negative, or Neutral.'
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-orange-600" />,
      title: 'Rich Analytics',
      description: 'Interactive charts showing sentiment distribution, trends, and language breakdown.'
    },
    {
      icon: <Upload className="h-8 w-8 text-teal-600" />,
      title: 'Secure Storage',
      description: 'Files are securely stored in Blob Storage with metadata tracking.'
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-red-600" />,
      title: 'Real-time Processing',
      description: 'Background processing with real-time status updates and notifications.'
    }
  ]

  return (
    <main className="flex-1">
      {/* Enhanced Hero Section */}
      <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
        
        <div className="relative container mx-auto px-4 py-20 flex items-center min-h-screen">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="text-left">
                {/* Badge */}
                <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-8 border border-white/20">
                  <Sparkles className="h-4 w-4 mr-2 text-yellow-400" />
                  AI-Powered Sentiment Analysis
                </div>
                
                {/* Main Heading */}
                <h1 className="text-5xl lg:text-7xl font-black text-white mb-6 leading-tight">
                  <span className="block">Understand</span>
                  <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-teal-400 bg-clip-text text-transparent">
                    Sentiment
                  </span>
                  <span className="block">Instantly</span>
                </h1>
                
                {/* Subtitle */}
                <p className="text-xl text-gray-300 mb-8 leading-relaxed max-w-2xl">
                  Transform your documents into actionable insights with our multilingual AI platform. 
                  Upload, analyze, and understand sentiment across English, Hindi, Gujarati, and Telugu content.
                </p>
                
                {/* Features List */}
                <div className="flex flex-wrap gap-6 mb-10">
                  <div className="flex items-center text-gray-300">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                    <span>Multi-language Support</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    <span>Real-time Processing</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                    <span>Advanced Analytics</span>
                  </div>
                </div>
                
                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {user ? (
                    <>
                      <Link
                        to="/dashboard"
                        className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
                      >
                        <BarChart3 className="h-5 w-5 mr-2" />
                        View Dashboard
                        <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Link>
                      <Link
                        to="/upload"
                        className="inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-200"
                      >
                        <Upload className="h-5 w-5 mr-2" />
                        Upload Article
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/register"
                        className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
                      >
                        Get Started Free
                        <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Link>
                      <Link
                        to="/login"
                        className="inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-200"
                      >
                        Sign In
                      </Link>
                    </>
                  )}
                </div>
              </div>
              
              {/* Right Content - Visual */}
              <div className="relative">
                {/* Floating Cards */}
                <div className="relative">
                  {/* Main Dashboard Preview */}
                  <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <BarChart3 className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-white font-semibold">Sentiment Analysis</span>
                      </div>
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      </div>
                    </div>
                    
                    {/* Mock Chart */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm">Positive</span>
                        <div className="flex-1 mx-4 bg-white/20 rounded-full h-2">
                          <div className="bg-green-400 h-2 rounded-full w-3/4"></div>
                        </div>
                        <span className="text-white text-sm font-medium">75%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm">Neutral</span>
                        <div className="flex-1 mx-4 bg-white/20 rounded-full h-2">
                          <div className="bg-gray-400 h-2 rounded-full w-1/2"></div>
                        </div>
                        <span className="text-white text-sm font-medium">20%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm">Negative</span>
                        <div className="flex-1 mx-4 bg-white/20 rounded-full h-2">
                          <div className="bg-red-400 h-2 rounded-full w-1/4"></div>
                        </div>
                        <span className="text-white text-sm font-medium">5%</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating Feature Cards */}
                  <div className="absolute -top-6 -right-6 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl p-4 shadow-xl transform rotate-3">
                    <Globe className="h-8 w-8 text-white" />
                  </div>
                  
                  <div className="absolute -bottom-6 -left-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 shadow-xl transform -rotate-3">
                    <Brain className="h-8 w-8 text-white" />
                  </div>
                  
                  <div className="absolute top-1/2 -right-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-3 shadow-xl">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Features Section */}
      <div className="py-32 bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 text-sm font-medium mb-6">
              <Zap className="h-4 w-4 mr-2" />
              Powerful Features
            </div>
            <h2 className="text-5xl font-black text-gray-900 dark:text-white mb-6">
              Everything You Need for
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Sentiment Analysis
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Our comprehensive platform provides all the tools and insights you need to understand sentiment 
              across multiple languages and document formats with enterprise-grade security.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-200 dark:border-gray-700"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="mb-6 transform group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  {/* Hover Arrow */}
                  <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="h-5 w-5 text-blue-600 dark:text-blue-400 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
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
                description: 'AI analyzes sentiment for both heading and content',
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