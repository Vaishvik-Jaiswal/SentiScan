import { Link } from 'react-router-dom'
import { 
  Github, 
  Linkedin, 
  Mail, 
  FileText, 
  BarChart3, 
  Shield, 
  Globe,
  Heart,
  ExternalLink,
  Bot
} from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    product: [
      { name: 'Features', href: '/about' },
      { name: 'Upload', href: '/upload' },
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Analytics', href: '/dashboard' }
    ],
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Contact', href: 'mailto:kashyapkshitij7704@gmail.com' },
      { name: 'Privacy Policy', href: '#' },
      { name: 'Terms of Service', href: '#' }
    ],
    resources: [
      { name: 'Documentation', href: '#' },
      { name: 'API Reference', href: '#' },
      { name: 'Support', href: 'mailto:kashyapkshitij7704@gmail.com' },
      { name: 'Blog', href: '#' }
    ]
  }

  const socialLinks = [
    {
      name: 'Portfolio',
      href: 'https://kshitij-kashyap-portfolio.netlify.app/',
      icon: <ExternalLink className="h-5 w-5" />
    },
    {
      name: 'GitHub',
      href: 'https://github.com/kshitijkashyap',
      icon: <Github className="h-5 w-5" />
    },
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com/in/kshitijkashyap',
      icon: <Linkedin className="h-5 w-5" />
    },
    {
      name: 'Email',
      href: 'mailto:kashyapkshitij7704@gmail.com',
      icon: <Mail className="h-5 w-5" />
    }
  ]

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              {/* <BarChart3 className="h-8 w-8 text-blue-400" />
              <span className="text-2xl font-bold">SentiScan</span> */}
              <Link
          to="/"
          className="flex items-center space-x-2 text-xl font-bold transition-colors"
        >
          <BarChart3 className="h-8 w-8 text-blue-400" />
          <div className="flex flex-col">
            <span className='hover:text-blue-400 dark:hover:text-blue-300'>SentiScan</span>
            <div className="flex items-center space-x-1 text-xs font-normal text-gray-500 dark:text-gray-400">
              <span>Powered by</span>
              <a
                href="https://ailifebot.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 hover:opacity-80 transition-opacity"
              >
                <img
                  src="/ailifebot_logo.png"
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
            </div>
            <p className="text-gray-300 mb-6 max-w-md">
              AI-powered multilingual sentiment analysis platform. Analyze emotions and opinions 
              in documents with cutting-edge technology.
            </p>
            
            {/* Features Icons */}
            <div className="flex space-x-4 mb-6">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <FileText className="h-4 w-4 text-blue-400" />
                <span>Multi-format</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Globe className="h-4 w-4 text-green-400" />
                <span>Multilingual</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Shield className="h-4 w-4 text-red-400" />
                <span>Secure</span>
              </div>
            </div>

            {/* Social Links */}
            {/* <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div> */}
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  {link.href.startsWith('mailto:') ? (
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </a>
                  ) : link.href === '#' ? (
                    <span className="text-gray-500 cursor-not-allowed">
                      {link.name}
                    </span>
                  ) : (
                    <Link
                      to={link.href}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link, index) => (
                <li key={index}>
                  {link.href.startsWith('mailto:') ? (
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </a>
                  ) : link.href === '#' ? (
                    <span className="text-gray-500 cursor-not-allowed">
                      {link.name}
                    </span>
                  ) : (
                    <Link
                      to={link.href}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © {currentYear} SentiScan. All rights reserved.
            </div>
            
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <span>Powered by</span>
                <a
                  href="https://ailifebot.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 hover:opacity-80 transition-opacity group"
                >
                  <img
                    src="/ailifebot_logo.png"
                    alt="AI LifeBot"
                    className="h-5 w-auto"
                    onError={(e) => {
                      // Fallback to Bot icon if image fails to load
                      e.target.style.display = 'none'
                      e.target.nextElementSibling.style.display = 'inline'
                    }}
                  />
                  <Bot className="h-4 w-4 hidden" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        {/* <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-green-900/20 border border-green-800 rounded-full text-green-400 text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>All systems operational</span>
          </div>
        </div> */}
      </div>
    </footer>
  )
}