import { 
  Brain, 
  Globe, 
  Shield, 
  Zap, 
  Users, 
  Award, 
  Target, 
  Heart,
  CheckCircle,
  FileText,
  BarChart3,
  Languages,
  Cloud,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import HelpFAQ from '../components/HelpFAQ'

export default function About() {
  const features = [
    {
      icon: <Brain className="h-8 w-8 text-blue-600" />,
      title: 'AI-Powered Analysis',
      description: 'Advanced sentiment analysis using Azure OpenAI GPT models for accurate and nuanced understanding of text emotions.'
    },
    {
      icon: <Languages className="h-8 w-8 text-green-600" />,
      title: 'Multilingual Support',
      description: 'Native support for English, Hindi, and Gujarati languages with automatic language detection.'
    },
    {
      icon: <Cloud className="h-8 w-8 text-purple-600" />,
      title: 'Cloud-Native',
      description: 'Built on Microsoft Azure infrastructure for scalability, security, and reliability.'
    },
    {
      icon: <Shield className="h-8 w-8 text-red-600" />,
      title: 'Enterprise Security',
      description: 'Bank-grade security with encrypted storage, secure authentication, and data privacy compliance.'
    }
  ]

  return (
    <main className="flex-1">
      {/* Enhanced Hero Section */}
      <div className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white py-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="relative container mx-auto px-4 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-8 border border-white/20">
            <Sparkles className="h-4 w-4 mr-2 text-yellow-400" />
            About SentiScan
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-black mb-8 leading-tight">
            <span className="block">Transforming Sentiment Analysis</span>
          </h1>
          
          <p className="text-2xl mb-8 opacity-90 max-w-3xl mx-auto leading-relaxed">
            Empowering with AI-driven multilingual sentiment analysis
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 mb-16">
            <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/20">
              <Award className="h-6 w-6 text-yellow-400" />
              <span className="font-medium">AI-Powered</span>
            </div>
            <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/20">
              <Globe className="h-6 w-6 text-green-400" />
              <span className="font-medium">Multilingual</span>
            </div>
            <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/20">
              <Shield className="h-6 w-6 text-blue-400" />
              <span className="font-medium">Enterprise Secure</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Features
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Combining cutting-edge AI technology with user-friendly design to deliver 
              the best sentiment analysis experience.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-700 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
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

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who trust SentiScan for their sentiment analysis needs. 
            Experience the power of AI-driven multilingual sentiment analysis today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
            >
              <Users className="h-5 w-5 mr-2" />
              Start Free Trial
            </a>
            <a
              href="/upload"
              className="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition-colors"
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              View Demo
            </a>
          </div>
        </div>
      </div>

      {/* Help/FAQ Section */}
      <HelpFAQ variant="compact" />
    </main>
  )
}
