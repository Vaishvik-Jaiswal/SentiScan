export default function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-gray-800 mt-auto py-4">
      <div className="container mx-auto text-center text-sm text-gray-600 dark:text-gray-400">
        © {new Date().getFullYear()}{" "}
        <a
          href="https://kshitij-kashyap-portfolio.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Kshitij Kashyap
        </a>{" "}
        • MERN Template • Vite + React + Tailwind
      </div>
    </footer>
  );
}
