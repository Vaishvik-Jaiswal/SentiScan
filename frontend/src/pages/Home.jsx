import { Link } from 'react-router-dom'

export default function Home() {
  const features = [
    {
      title: '🚀 Ready-to-Go Setup',
      description: 'Preconfigured Vite + React + Tailwind for blazing-fast builds.'
    },
    {
      title: '💾 Organized Structure',
      description: 'Backend: config, models, controllers, routes & middleware. Frontend: components, pages & services.'
    },
    {
      title: '🔐 Auth & API Layer',
      description: 'Hook in JWT auth and centralize API calls in a single service file.'
    },
    {
      title: '🎨 Beautiful UI',
      description: 'Responsive, Tailwind-powered components: Navbar, Footer, Dashboard, and more.'
    },
    {
      title: '⚙️ Extensible & Scalable',
      description: 'Add Redux/Context, React Query, PWA, Docker, CI/CD, Storybook with minimal effort.'
    },
    {
      title: '🧪 Testing & Quality',
      description: 'ESLint, Prettier, Jest + React Testing Library, and GitHub Actions ready to go.'
    }
  ]

  return (
    <main className="flex-1 container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold mb-4 text-blue-600 dark:text-blue-400">
          Welcome to the MERN Stack Template
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Kickstart your project with a fully featured, production-ready boilerplate.
        </p>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Developed by <span className='text-blue-600'>
        <a
          href="https://kshitij-kashyap-portfolio.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Kshitij Kashyap
        </a></span>
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 mb-12">
        {features.map(f => (
          <div
            key={f.title}
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow hover:shadow-lg transition cursor-pointer"
          >
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
              {f.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {f.description}
            </p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Link
          to="/dashboard"
          className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg shadow hover:bg-blue-500 transition"
        >
          Explore the Dashboard
        </Link>
      </div>
    </main>
  )
}
