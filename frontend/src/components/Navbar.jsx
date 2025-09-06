// src/components/Navbar.jsx
import { useContext, useState } from 'react'
import { Sun, Moon, Menu, X } from 'lucide-react'
import { ThemeContext } from '../context/ThemeContext'
import { Link } from 'react-router-dom'

export default function Navbar() {
  const { theme, toggle } = useContext(ThemeContext)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto flex items-center p-4">
        {/* Logo */}
        <Link
          to="/"
          className="text-xl font-bold text-blue-600 dark:text-blue-400"
        >
          MERN Template
        </Link>

        {/* Right side: links + toggles */}
        <div className="ml-auto flex items-center space-x-4">
          {/* Desktop links */}
          <ul className="hidden md:flex space-x-8">
            {['/', '/dashboard', '/about'].map((path, i) => {
              const label = path === '/' ? 'Home' : path.slice(1).charAt(0).toUpperCase() + path.slice(2)
              return (
                <li key={i}>
                  <Link
                    to={path}
                    className="hover:text-blue-500 dark:hover:text-blue-300"
                    onClick={() => setIsOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
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
          {['/', '/dashboard', '/about'].map((path, i) => {
            const label = path === '/' ? 'Home' : path.slice(1).charAt(0).toUpperCase() + path.slice(2)
            return (
              <li key={i}>
                <Link
                  to={path}
                  className="block px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  onClick={() => setIsOpen(false)}
                >
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
