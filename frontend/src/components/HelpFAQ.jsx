import { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle, Mail, MessageCircle, Book } from 'lucide-react'

export default function HelpFAQ({ variant = "full" }) {
  const [openItems, setOpenItems] = useState(new Set([0])) // First item open by default

  const toggleItem = (index) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index)
    } else {
      newOpenItems.add(index)
    }
    setOpenItems(newOpenItems)
  }

  const faqData = [
    {
      category: "Getting Started",
      questions: [
        {
          question: "What file formats does SentiScan support?",
          answer: "SentiScan supports PDF, DOCX, TXT files, and images (JPG, PNG, GIF, BMP, WebP). We use OCR technology to extract text from images and maintain document formatting for accurate analysis."
        },
        {
          question: "How do I upload and analyze my first document?",
          answer: "Simply create an account, go to the Upload page, drag and drop your file or click to browse. You can also paste text directly. The system will automatically detect the language and start sentiment analysis using Azure OpenAI."
        },
        {
          question: "What languages are supported for sentiment analysis?",
          answer: "Currently, SentiScan supports English, Hindi, Gujarati, and Telugu languages with automatic language detection. We're working on adding more languages based on user demand."
        }
      ]
    },
    {
      category: "Features & Functionality",
      questions: [
        {
          question: "How accurate is the sentiment analysis?",
          answer: "Our sentiment analysis uses Azure OpenAI's advanced GPT models, achieving over 90% accuracy across supported languages. The AI understands context, sarcasm, and cultural nuances for more accurate results."
        },
        {
          question: "Can I analyze multiple documents at once?",
          answer: "Yes! You can upload multiple documents and track their processing status in your dashboard. Each document is processed individually with detailed sentiment analysis for both headings and content."
        },
        {
          question: "What analytics and insights do I get?",
          answer: "You'll receive comprehensive analytics including sentiment distribution charts, language breakdown, trend analysis over time, and detailed reports for each document with confidence scores."
        },
        {
          question: "How does the AI handle complex sentiments?",
          answer: "Our AI analyzes content and classifies it as Positive, Negative, or Neutral. Content with both positive and negative elements is typically classified as Neutral, providing balanced sentiment analysis."
        }
      ]
    },
    {
      category: "Account & Security",
      questions: [
        {
          question: "How secure is my data?",
          answer: "Your data is stored securely in Microsoft Azure with enterprise-grade encryption. We're GDPR compliant and never share your content with third parties. You can delete your data at any time."
        },
        {
          question: "Do you store my uploaded documents?",
          answer: "Yes, documents are securely stored in Azure Blob Storage to enable re-analysis and tracking. You have full control over your data and can delete documents from your dashboard at any time."
        },
        {
          question: "Can I export my analysis results?",
          answer: "Yes, you can export your analysis results, charts, and reports in various formats. The dashboard provides options to download data for further analysis or reporting."
        }
      ]
    },
    {
      category: "Pricing & Limits",
      questions: [
        {
          question: "Is SentiScan free to use?",
          answer: "SentiScan offers a free tier with generous limits for individual users. For businesses and researchers with higher volume needs, we offer affordable premium plans."
        },
        {
          question: "What are the file size limits?",
          answer: "Individual files can be up to 10MB in size. This accommodates most documents while ensuring fast processing times. For larger files, consider breaking them into smaller sections."
        },
        {
          question: "How fast is the analysis process?",
          answer: "Most documents are analyzed within 30-60 seconds. Processing time depends on document length and current system load. You'll receive real-time status updates during processing."
        }
      ]
    }
  ]

  const supportOptions = [
    {
      icon: <Mail className="h-6 w-6" />,
      title: "Email Support",
      description: "Get help via email",
      action: "Contact Us",
      href: "mailto:kashyapkshitij7704@gmail.com"
    },
    {
      icon: <Book className="h-6 w-6" />,
      title: "Documentation",
      description: "Browse our guides",
      action: "Read Docs",
      href: "#"
    },
    {
      icon: <MessageCircle className="h-6 w-6" />,
      title: "Community",
      description: "Join discussions",
      action: "Join Community",
      href: "#"
    }
  ]

  if (variant === "compact") {
    // Show only first 6 questions
    const compactFAQ = faqData.slice(0, 2).map(category => ({
      ...category,
      questions: category.questions.slice(0, 3)
    }))

    return (
      <div className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Quick answers to common questions
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            {compactFAQ.map((category, categoryIndex) => (
              <div key={categoryIndex} className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {category.category}
                </h3>
                <div className="space-y-4">
                  {category.questions.map((item, index) => {
                    const itemIndex = categoryIndex * 10 + index // Unique index
                    const isOpen = openItems.has(itemIndex)
                    
                    return (
                      <div
                        key={index}
                        className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <button
                          onClick={() => toggleItem(itemIndex)}
                          className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="font-medium text-gray-900 dark:text-white">
                            {item.question}
                          </span>
                          {isOpen ? (
                            <ChevronUp className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-4">
                            <p className="text-gray-600 dark:text-gray-300">
                              {item.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-24 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <HelpCircle className="h-16 w-16 text-blue-600 mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Help Center
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Find answers to common questions and get the most out of SentiScan
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-12">
          {/* Support Options */}
          <div className="lg:col-span-1">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Need More Help?
            </h3>
            <div className="space-y-4">
              {supportOptions.map((option, index) => (
                <a
                  key={index}
                  href={option.href}
                  className="block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-600">
                      {option.icon}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {option.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {option.description}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* FAQ Content */}
          <div className="lg:col-span-3">
            <div className="space-y-8">
              {faqData.map((category, categoryIndex) => (
                <div key={categoryIndex}>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                    {category.category}
                  </h3>
                  <div className="space-y-4">
                    {category.questions.map((item, index) => {
                      const itemIndex = categoryIndex * 10 + index // Unique index
                      const isOpen = openItems.has(itemIndex)
                      
                      return (
                        <div
                          key={index}
                          className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                          <button
                            onClick={() => toggleItem(itemIndex)}
                            className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-lg"
                          >
                            <span className="font-medium text-gray-900 dark:text-white">
                              {item.question}
                            </span>
                            {isOpen ? (
                              <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0 ml-4" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0 ml-4" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="px-6 pb-4">
                              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                {item.answer}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-16 text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Still have questions?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Can't find the answer you're looking for? Our support team is here to help.
            </p>
            <a
              href="mailto:kashyapkshitij7704@gmail.com"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              <Mail className="h-5 w-5" />
              <span>Contact Support</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

