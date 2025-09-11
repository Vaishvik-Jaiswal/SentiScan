import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import { 
  Eye, 
  EyeOff, 
  BarChart3, 
  Mail, 
  Lock, 
  User,
  ArrowRight,
  Shield,
  Zap,
  Globe
} from 'lucide-react'

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await login(formData.username, formData.password)
    
    if (result.success) {
      toast.success('Login successful!')
      navigate('/dashboard')
    } else {
      toast.error(result.message)
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-600 to-teal-600 p-12 flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10">
            <Link to="/" className="flex items-center space-x-3 text-2xl font-bold">
              <BarChart3 className="h-10 w-10" />
              <span>SentiScan</span>
            </Link>
          </div>
          
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-6">
              Welcome back to the future of sentiment analysis
            </h1>
            <p className="text-xl mb-8 opacity-90">
              Analyze emotions and opinions in your documents with AI-powered multilingual sentiment analysis.
            </p>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <Globe className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Multilingual Support</h3>
                  <p className="text-sm opacity-80">English, Hindi, and Gujarati</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Enterprise Security</h3>
                  <p className="text-sm opacity-80">Bank-grade encryption and privacy</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Real-time Analysis</h3>
                  <p className="text-sm opacity-80">Get insights in seconds</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 text-sm opacity-80">
            © 2024 SentiScan. All rights reserved.
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center">
              <Link to="/" className="inline-flex items-center space-x-3 text-2xl font-bold text-gray-900 dark:text-white">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <span>SentiScan</span>
              </Link>
            </div>

            {/* Header */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Welcome back!
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Please sign in to your account
              </p>
            </div>

            {/* Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Username Field */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                      placeholder="Enter your username"
                      value={formData.username}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 font-medium"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            {/* Sign up link */}
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  Create one now
                </Link>
              </p>
            </div>

            {/* Features for mobile */}
            <div className="lg:hidden mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center space-x-3">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Multilingual Analysis</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Enterprise Security</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Zap className="h-5 w-5 text-purple-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Real-time Processing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
