import { useContext, useState, useEffect } from 'react'
import { Sun, Moon, Menu, X, LogOut, BarChart3, User, Settings, Bot, Shield } from 'lucide-react'
import { ThemeContext } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { theme, toggle } = useContext(ThemeContext)
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const location = useLocation()

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false)
    setShowUserMenu(false)
  }, [location])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.navbar-container')) {
        setIsOpen(false)
        setShowUserMenu(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    setIsOpen(false)
    setShowUserMenu(false)
  }

  const isActivePage = (path) => {
    return location.pathname === path
  }

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50 navbar-container">
      <div className="container mx-auto flex items-center justify-between p-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center space-x-2 text-xl font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <BarChart3 className="h-8 w-8" />
          <div className="flex flex-col">
            <span>SentiScan</span>
            <div className="flex items-center space-x-1 text-xs font-normal text-gray-500 dark:text-gray-400">
              <span>Powered by</span>
              <a
                href="https://ailifebot.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 hover:opacity-80 transition-opacity"
              >
                <img
                  src="/ailifebot_logo_1.png"
                  alt="AI LifeBot"
                  className="h-4 w-auto"
                  onError={(e) => {
                    // Fallback to Bot icon if image fails to load
                    e.target.style.display = 'none'
                    e.target.nextElementSibling.style.display = 'inline'
                  }}
                />
              </a>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <Link
            to="/"
            className={`font-medium transition-colors ${
              isActivePage('/') 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            Home
          </Link>
          
          <Link
            to="/about"
            className={`font-medium transition-colors ${
              isActivePage('/about') 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            About
          </Link>

          {user && (
            <>
              <Link
                to="/dashboard"
                className={`font-medium transition-colors ${
                  isActivePage('/dashboard') 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                Dashboard
              </Link>
              
              <Link
                to="/upload"
                className={`font-medium transition-colors ${
                  isActivePage('/upload') 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                Article Upload
              </Link>
              
              <Link
                to="/compare-news"
                className={`font-medium transition-colors ${
                  isActivePage('/compare-news') 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                Article Compare
              </Link>

              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`flex items-center space-x-1 font-medium transition-colors ${
                    isActivePage('/admin') 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  <span>Admin</span>
                </Link>
              )}
            </>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <User className="h-5 w-5" />
                  <span className="font-medium">{user.username}</span>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                    
                    <Link
                      to="/dashboard"
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                    
                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        className="flex items-center space-x-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Shield className="h-4 w-4" />
                        <span>Admin Panel</span>
                      </Link>
                    )}
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="container mx-auto px-4 py-4 space-y-4">
              <Link
                to="/"
                className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
                  isActivePage('/') 
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              
              <Link
                to="/about"
                className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
                  isActivePage('/about') 
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>

              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
                      isActivePage('/dashboard') 
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Link>
                  
                  <Link
                    to="/upload"
                    className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
                      isActivePage('/upload') 
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    Upload
                  </Link>
                  
                  <Link
                    to="/compare-news"
                    className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
                      isActivePage('/compare-news') 
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    Compare News
                  </Link>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Signed in as <span className="font-medium text-gray-700 dark:text-gray-300">{user.username}</span>
                    </div>
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                  <Link
                    to="/login"
                    className="block w-full text-center px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                  
                  <Link
                    to="/register"
                    className="block w-full text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}