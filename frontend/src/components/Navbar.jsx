import { useContext, useState } from 'react'
import { Sun, Moon, Menu, X, LogOut } from 'lucide-react'
import { ThemeContext } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

export default function Navbar() {
  const { theme, toggle } = useContext(ThemeContext)
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setIsOpen(false)
  }

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto flex items-center p-4">
        {/* Logo */}
        <Link
          to="/"
          className="text-xl font-bold text-blue-600 dark:text-blue-400"
        >
          SentiScan
        </Link>

        {/* Right side: links + toggles */}
        <div className="ml-auto flex items-center space-x-4">
          {/* Desktop links */}
          <ul className="hidden md:flex space-x-8 items-center">
            <li>
              <Link
                to="/"
                className="hover:text-blue-500 dark:hover:text-blue-300"
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
            </li>
            {user ? (
              <>
                <li>
                  <Link
                    to="/dashboard"
                    className="hover:text-blue-500 dark:hover:text-blue-300"
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to="/upload"
                    className="hover:text-blue-500 dark:hover:text-blue-300"
                    onClick={() => setIsOpen(false)}
                  >
                    Upload
                  </Link>
                </li>
                <li>
                  <span className="text-gray-700 dark:text-gray-300">
                    Welcome, {user.username}
                  </span>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link
                    to="/login"
                    className="hover:text-blue-500 dark:hover:text-blue-300"
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Register
                  </Link>
                </li>
              </>
            )}
            <li>
              <Link
                to="/about"
                className="hover:text-blue-500 dark:hover:text-blue-300"
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>
            </li>
          </ul>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            onClick={() => setIsOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700`}>
        <ul className="flex flex-col space-y-2 p-4">
          <li>
            <Link
              to="/"
              className="block px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
          </li>
          {user ? (
            <>
              <li>
                <Link
                  to="/dashboard"
                  className="block px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/upload"
                  className="block px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  onClick={() => setIsOpen(false)}
                >
                  Upload
                </Link>
              </li>
              <li>
                <div className="px-2 py-1 text-gray-700 dark:text-gray-300">
                  Welcome, {user.username}
                </div>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition"
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link
                  to="/login"
                  className="block px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="block px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors mx-2"
                  onClick={() => setIsOpen(false)}
                >
                  Register
                </Link>
              </li>
            </>
          )}
          <li>
            <Link
              to="/about"
              className="block px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              onClick={() => setIsOpen(false)}
            >
              About
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}
