import asyncHandler from 'express-async-handler'
import Newspaper from '../models/Newspaper.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import newspaperProcessor from '../services/newspaperProcessor.js'
import azureStorage from '../services/azureStorage.js'
import puppeteer from 'puppeteer'
import { ChartJSNodeCanvas } from 'chartjs-node-canvas'

// Configure multer for newspaper upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `newspaper-${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true)
  } else {
    cb(new Error('Only PDF files are allowed for newspaper upload'), false)
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for newspapers
  }
})

// @desc    Upload and analyze newspaper
// @route   POST /api/newspaper/upload
// @access  Private
export const uploadNewspaper = asyncHandler(async (req, res) => {
  const { newspaperName, publicationDate } = req.body

  if (!req.file) {
    res.status(400)
    throw new Error('Please upload a PDF file')
  }

  if (!newspaperName) {
    res.status(400)
    throw new Error('Newspaper name is required')
  }

  try {
    console.log('📰 Starting newspaper upload and analysis...')
    
    // Create newspaper record
    const newspaper = await Newspaper.create({
      userId: req.user._id,
      newspaperName: newspaperName.trim(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      publicationDate: publicationDate ? new Date(publicationDate) : new Date(),
      processingStatus: 'pending',
    })

    // Start background processing
    processNewspaperAnalysis(newspaper._id, req.file.path)

    res.status(201).json({
      _id: newspaper._id,
      newspaperName: newspaper.newspaperName,
      originalName: newspaper.originalName,
      fileSize: newspaper.fileSize,
      processingStatus: newspaper.processingStatus,
      createdAt: newspaper.createdAt,
      message: 'Newspaper uploaded successfully. Analysis is starting...'
    })

  } catch (error) {
    // Clean up uploaded file if database operation fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    console.error('Error uploading newspaper:', error)
    throw error
  }
})

// Function to process newspaper with proper status updates
const processNewspaperWithStatusUpdates = async (newspaperId, filePath, newspaperName) => {
  console.log('📄 Step 1: Text extraction in progress...')
  
  // Extract raw text from PDF
  const rawText = await newspaperProcessor.extractTextFromPDF(filePath)
  
  // Step 2: Language Detection
  await Newspaper.findByIdAndUpdate(newspaperId, {
    processingStep: 'language',
    processingMessage: 'Detecting dominant language...'
  })
  console.log('🌐 Step 2: Starting language detection...')
  
  const dominantLanguage = newspaperProcessor.detectDominantLanguage(rawText.text)
  console.log(`🌐 Detected dominant language: ${dominantLanguage}`)
  
  // Update with detected language
  await Newspaper.findByIdAndUpdate(newspaperId, {
    dominantLanguage: dominantLanguage
  })
  
  // Step 3: Article Extraction
  await Newspaper.findByIdAndUpdate(newspaperId, {
    processingStep: 'articles',
    processingMessage: 'Extracting individual articles...'
  })
  console.log('📰 Step 3: Starting article extraction...')
  
  const articles = await newspaperProcessor.extractArticles(rawText.text, dominantLanguage)
  console.log(`📄 Extracted ${articles.length} articles from newspaper`)
  
  // Update with article count
  await Newspaper.findByIdAndUpdate(newspaperId, {
    totalArticles: articles.length
  })
  
  // Step 4: Sentiment Analysis
  await Newspaper.findByIdAndUpdate(newspaperId, {
    processingStep: 'sentiment',
    processingMessage: `Analyzing sentiment for ${articles.length} articles...`
  })
  console.log('🧠 Step 4: Starting sentiment analysis...')
  
  const analyzedArticles = await newspaperProcessor.analyzeSentimentForArticles(articles)
  
  // Step 5: Final Analysis
  await Newspaper.findByIdAndUpdate(newspaperId, {
    processingStep: 'analysis',
    processingMessage: 'Generating comprehensive analysis and insights...'
  })
  console.log('📊 Step 5: Starting final analysis...')
  
  const categorizedArticles = newspaperProcessor.categorizeArticlesBySentiment(analyzedArticles)
  const analysis = newspaperProcessor.generateComprehensiveAnalysis(analyzedArticles, categorizedArticles, newspaperName)
  
  return {
    articles: analyzedArticles,
    categorizedArticles,
    analysis,
    totalArticles: analyzedArticles.length,
    dominantLanguage,
    processingStatus: 'completed'
  }
}

// Background function to process newspaper analysis
const processNewspaperAnalysis = async (newspaperId, filePath) => {
  console.log(`📰 Starting newspaper analysis for ${newspaperId}...`)
  
  try {
    // Update status to processing with initial step
    await Newspaper.findByIdAndUpdate(newspaperId, {
      processingStatus: 'processing',
      processingStep: 'extraction',
      processingMessage: 'Extracting text from PDF...'
    })

    const newspaper = await Newspaper.findById(newspaperId)
    if (!newspaper) {
      console.error(`❌ Newspaper not found: ${newspaperId}`)
      return
    }

    // Process newspaper using dedicated processor with status updates
    console.log('📰 Processing newspaper with advanced extraction and analysis...')
    const processingResult = await processNewspaperWithStatusUpdates(newspaperId, filePath, newspaper.newspaperName)
    
    const {
      articles: analyzedArticles,
      categorizedArticles,
      analysis: overallMetrics,
      totalArticles,
      dominantLanguage,
    } = processingResult

    if (analyzedArticles.length === 0) {
      throw new Error('No articles could be extracted from the newspaper')
    }

    console.log(`✅ Processing completed: ${analyzedArticles.length} articles analyzed`)
    
    // Generate comprehensive report using the analysis data
    console.log('📝 Generating comprehensive report...')
    const compiledReport = {
      summary: `Comprehensive analysis of "${newspaper.newspaperName}" containing ${totalArticles} articles with an overall ${overallMetrics.summary.overallSentiment.toLowerCase()} sentiment. The analysis reveals a quality score of ${overallMetrics.summary.qualityScore}/100 with ${dominantLanguage} as the dominant language.`,
      keyFindings: [
        `${totalArticles} articles analyzed with ${overallMetrics.sentimentDistribution.counts.positive} positive, ${overallMetrics.sentimentDistribution.counts.negative} negative, and ${overallMetrics.sentimentDistribution.counts.neutral} neutral articles`,
        `Overall sentiment: ${overallMetrics.summary.overallSentiment}`,
        `Dominant language: ${dominantLanguage}`,
        `Quality score: ${overallMetrics.summary.qualityScore}/100`,
        ...overallMetrics.insights
      ],
      sentimentAnalysis: `The newspaper shows ${overallMetrics.sentimentDistribution.percentages.positive}% positive, ${overallMetrics.sentimentDistribution.percentages.negative}% negative, and ${overallMetrics.sentimentDistribution.percentages.neutral}% neutral content.`,
      languageAnalysis: `Primary language is ${dominantLanguage} with ${Object.keys(overallMetrics.languageDistribution).length} languages detected.`,
      topicsIdentified: Object.keys(overallMetrics.languageDistribution),
      recommendations: overallMetrics.recommendations,
      detailedInsights: null,
      categorizedArticles
    }

    // Step 6: Upload to Azure Storage (optional)
    let blobUrl = ''
    try {
      if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
        console.log('☁️ Uploading to Azure Storage...')
        const uploadResult = await azureStorage.uploadFile(filePath, newspaper.filename)
        blobUrl = uploadResult.url || uploadResult.publicUrl || ''
        console.log('✅ File uploaded to Azure Storage')
      }
    } catch (error) {
      console.warn('⚠️ Azure Storage upload failed:', error.message)
    }

    // Step 7: Update newspaper with results
    await Newspaper.findByIdAndUpdate(newspaperId, {
      articles: analyzedArticles.map(article => ({
        title: article.headline,
        content: article.content,
        headingSentiment: article.headingSentiment,
        headingSentimentReason: article.headingSentimentReason,
        headingSentimentScore: article.headingSentimentScore || 0,
        headingPercentages: article.headingPercentages || { positive: 0, negative: 0, neutral: 100 },
        contentSentiment: article.contentSentiment,
        contentSentimentReason: article.contentSentimentReason,
        contentSentimentScore: article.contentSentimentScore || 0,
        contentPercentages: article.contentPercentages || { positive: 0, negative: 0, neutral: 100 },
        sentimentConfidence: article.sentimentConfidence,
        detectedLanguage: article.language,
        wordCount: article.wordCount,
        pageNumber: 1, // Will be enhanced later
        position: article.startIndex || 0,
        insights: article.insights || [], // Add insights field
      })),
      totalArticles: analyzedArticles.length,
      overallSentiment: overallMetrics.summary.overallSentiment,
      sentimentDistribution: overallMetrics.sentimentDistribution.counts,

      languageBreakdown: overallMetrics.languageDistribution,
      dominantLanguage: dominantLanguage,
      analysisMetrics: {
        averageArticleLength: overallMetrics.qualityMetrics.averageWordCount,
        totalWordCount: analyzedArticles.reduce((sum, article) => sum + article.wordCount, 0),
        diversityIndex: 75, // Placeholder
        qualityScore: overallMetrics.summary.qualityScore,
      },
      compiledReport,
      blobUrl,
      reportGeneratedAt: new Date(),
      processingStatus: 'completed',
    })

    console.log(`✅ Newspaper analysis completed for ${newspaperId}`)

  } catch (error) {
    console.error(`❌ Error processing newspaper analysis for ${newspaperId}:`, error)
    
    await Newspaper.findByIdAndUpdate(newspaperId, {
      processingStatus: 'failed',
      processingError: error.message,
    })
  } finally {
    // Clean up temporary file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      console.log('🗑️ Temporary file cleaned up')
    }
  }
}



// @desc    Get user's newspapers
// @route   GET /api/newspaper
// @access  Private
export const getUserNewspapers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const skip = (page - 1) * limit

  const newspapers = await Newspaper.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-articles -compiledReport') // Exclude large data for list view

  const total = await Newspaper.countDocuments({ userId: req.user._id })

  res.json({
    newspapers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
})

// @desc    Get newspaper by ID
// @route   GET /api/newspaper/:id
// @access  Private
export const getNewspaperById = asyncHandler(async (req, res) => {
  const newspaper = await Newspaper.findOne({
    _id: req.params.id,
    userId: req.user._id,
  })

  if (!newspaper) {
    res.status(404)
    throw new Error('Newspaper not found')
  }

  res.json(newspaper)
})

// @desc    Delete newspaper
// @route   DELETE /api/newspaper/:id
// @access  Private
export const deleteNewspaper = asyncHandler(async (req, res) => {
  const newspaper = await Newspaper.findOne({
    _id: req.params.id,
    userId: req.user._id,
  })

  if (!newspaper) {
    res.status(404)
    throw new Error('Newspaper not found')
  }

  // Delete from Azure Storage if exists
  if (newspaper.blobUrl && process.env.AZURE_STORAGE_CONNECTION_STRING) {
    try {
      await azureStorage.deleteFile(newspaper.filename)
    } catch (error) {
      console.warn('⚠️ Failed to delete file from Azure Storage:', error.message)
    }
  }

  await Newspaper.findByIdAndDelete(req.params.id)

  res.json({ message: 'Newspaper deleted successfully' })
})

// @desc    Generate PDF report for newspaper analysis
// @route   GET /api/newspaper/:id/pdf-report
// @access  Private
export const generatePDFReport = asyncHandler(async (req, res) => {
  const newspaper = await Newspaper.findOne({
    _id: req.params.id,
    userId: req.user._id,
  })

  if (!newspaper) {
    res.status(404)
    throw new Error('Newspaper not found')
  }

  if (newspaper.processingStatus !== 'completed') {
    res.status(400)
    throw new Error('Newspaper analysis is not yet completed')
  }

  try {
    console.log('📄 Generating PDF report for newspaper:', newspaper._id)
    console.log('📊 Newspaper data available:', {
      hasArticles: !!newspaper.articles?.length,
      articleCount: newspaper.articles?.length || 0,
      hasSentimentDistribution: !!newspaper.sentimentDistribution,
      hasLanguageBreakdown: !!newspaper.languageBreakdown,
      hasCompiledReport: !!newspaper.compiledReport
    })
    
    // Generate chart images
    console.log('📈 Generating chart images...')
    const chartImages = await generateNewspaperChartImages(newspaper)
    console.log('✅ Chart images generated:', Object.keys(chartImages))
    
    // Generate HTML content for PDF
    console.log('📝 Generating HTML content...')
    const htmlContent = await generateNewspaperReportHTML(newspaper, chartImages)
    console.log('✅ HTML content generated, length:', htmlContent.length)
    
    // Generate PDF using Puppeteer
    console.log('🖨️ Launching Puppeteer...')
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      timeout: 30000
    })
    
    const page = await browser.newPage()
    console.log('📄 Setting HTML content...')
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
    
    console.log('📄 Generating PDF...')
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    })
    
    await browser.close()
    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes')
    
    // Set response headers for PDF download
    const filename = `newspaper-analysis-${newspaper.newspaperName.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.setHeader('Cache-Control', 'no-cache')
    
    console.log('📤 Sending PDF response...')
    res.send(pdfBuffer)
    
  } catch (error) {
    console.error('❌ Error generating PDF report:', error)
    console.error('❌ Error stack:', error.stack)
    res.status(500).json({ 
      message: 'Failed to generate PDF report', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Generate comprehensive chart images for newspaper PDF report
const generateNewspaperChartImages = async (newspaper) => {
  console.log('📊 Starting comprehensive chart generation...')
  const charts = {}

  try {
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
      width: 800, 
      height: 400,
      backgroundColour: 'white'
    })

    const smallChartCanvas = new ChartJSNodeCanvas({ 
      width: 600, 
      height: 300,
      backgroundColour: 'white'
    })

    // Ensure sentiment distribution data exists
    const sentimentData = newspaper.sentimentDistribution || { positive: 0, negative: 0, neutral: 0 }
    console.log('📊 Sentiment data:', sentimentData)

    // 1. Sentiment Distribution Pie Chart
    const sentimentChart = {
      type: 'pie',
      data: {
        labels: ['Positive', 'Negative', 'Neutral'],
        datasets: [{
          data: [
            sentimentData.positive || 0,
            sentimentData.negative || 0,
            sentimentData.neutral || 0
          ],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(156, 163, 175, 0.8)'
          ],
          borderColor: [
            'rgba(34, 197, 94, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(156, 163, 175, 1)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: 'Sentiment Distribution',
            font: { size: 18, weight: 'bold' }
          },
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              font: { size: 12 }
            }
          }
        }
      }
    }
    
    console.log('📊 Generating sentiment pie chart...')
    charts.sentimentChart = await chartJSNodeCanvas.renderToBuffer(sentimentChart)
    console.log('✅ Sentiment chart generated')

    // 2. Sentiment Distribution Doughnut Chart with percentages
    const total = sentimentData.positive + sentimentData.negative + sentimentData.neutral
    const sentimentDoughnutChart = {
      type: 'doughnut',
      data: {
        labels: [
          `Positive (${total > 0 ? Math.round((sentimentData.positive / total) * 100) : 0}%)`,
          `Negative (${total > 0 ? Math.round((sentimentData.negative / total) * 100) : 0}%)`,
          `Neutral (${total > 0 ? Math.round((sentimentData.neutral / total) * 100) : 0}%)`
        ],
        datasets: [{
          data: [
            sentimentData.positive || 0,
            sentimentData.negative || 0,
            sentimentData.neutral || 0
          ],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(156, 163, 175, 0.8)'
          ],
          borderColor: [
            'rgba(34, 197, 94, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(156, 163, 175, 1)'
          ],
          borderWidth: 3
        }]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: 'Sentiment Analysis Overview',
            font: { size: 18, weight: 'bold' }
          },
          legend: {
            position: 'right',
            labels: {
              padding: 15,
              font: { size: 11 }
            }
          }
        },
        cutout: '50%'
      }
    }
    
    console.log('📊 Generating sentiment doughnut chart...')
    charts.sentimentDoughnutChart = await smallChartCanvas.renderToBuffer(sentimentDoughnutChart)
    console.log('✅ Sentiment doughnut chart generated')

    // 3. Language Distribution Bar Chart
    const languageData = newspaper.languageBreakdown || {}
    const languageEntries = Object.entries(languageData).filter(([lang, count]) => count > 0)
    console.log('📊 Language data:', languageData)
    
    if (languageEntries.length > 0) {
      const languageChart = {
        type: 'bar',
        data: {
          labels: languageEntries.map(([lang]) => lang.charAt(0).toUpperCase() + lang.slice(1)),
          datasets: [{
            label: 'Number of Articles',
            data: languageEntries.map(([, count]) => count),
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(139, 92, 246, 0.8)',
              'rgba(236, 72, 153, 0.8)'
            ],
            borderColor: [
              'rgba(59, 130, 246, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(139, 92, 246, 1)',
              'rgba(236, 72, 153, 1)'
            ],
            borderWidth: 2
          }]
        },
        options: {
          responsive: false,
          plugins: {
            title: {
              display: true,
              text: 'Language Distribution',
              font: { size: 18, weight: 'bold' }
            },
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                font: { size: 12 }
              },
              title: {
                display: true,
                text: 'Number of Articles',
                font: { size: 14 }
              }
            },
            x: {
              ticks: {
                font: { size: 12 }
              }
            }
          }
        }
      }
      
      console.log('📊 Generating language chart...')
      charts.languageChart = await chartJSNodeCanvas.renderToBuffer(languageChart)
      console.log('✅ Language chart generated')
    }

    // 4. Article Length Distribution
    if (newspaper.articles && newspaper.articles.length > 0) {
      const wordCounts = newspaper.articles.map(article => article.wordCount || 0)
      const lengthRanges = {
        'Short (0-100)': wordCounts.filter(count => count <= 100).length,
        'Medium (101-300)': wordCounts.filter(count => count > 100 && count <= 300).length,
        'Long (301-500)': wordCounts.filter(count => count > 300 && count <= 500).length,
        'Very Long (500+)': wordCounts.filter(count => count > 500).length
      }

      const lengthChart = {
        type: 'bar',
        data: {
          labels: Object.keys(lengthRanges),
          datasets: [{
            label: 'Number of Articles',
            data: Object.values(lengthRanges),
            backgroundColor: 'rgba(168, 85, 247, 0.8)',
            borderColor: 'rgba(168, 85, 247, 1)',
            borderWidth: 2
          }]
        },
        options: {
          responsive: false,
          plugins: {
            title: {
              display: true,
              text: 'Article Length Distribution',
              font: { size: 18, weight: 'bold' }
            },
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                font: { size: 12 }
              },
              title: {
                display: true,
                text: 'Number of Articles',
                font: { size: 14 }
              }
            },
            x: {
              ticks: {
                font: { size: 11 }
              }
            }
          }
        }
      }

      console.log('📊 Generating article length chart...')
      charts.lengthChart = await chartJSNodeCanvas.renderToBuffer(lengthChart)
      console.log('✅ Article length chart generated')
    }

    // 5. Sentiment Confidence Distribution
    if (newspaper.articles && newspaper.articles.length > 0) {
      const confidenceLevels = {
        'High': newspaper.articles.filter(article => article.sentimentConfidence === 'high').length,
        'Medium': newspaper.articles.filter(article => article.sentimentConfidence === 'medium').length,
        'Low': newspaper.articles.filter(article => article.sentimentConfidence === 'low').length
      }

      const confidenceChart = {
        type: 'doughnut',
        data: {
          labels: Object.keys(confidenceLevels),
          datasets: [{
            data: Object.values(confidenceLevels),
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(239, 68, 68, 0.8)'
            ],
            borderColor: [
              'rgba(34, 197, 94, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(239, 68, 68, 1)'
            ],
            borderWidth: 2
          }]
        },
        options: {
          responsive: false,
          plugins: {
            title: {
              display: true,
              text: 'Sentiment Analysis Confidence',
              font: { size: 18, weight: 'bold' }
            },
            legend: {
              position: 'bottom',
              labels: {
                padding: 15,
                font: { size: 12 }
              }
            }
          },
          cutout: '40%'
        }
      }

      console.log('📊 Generating confidence chart...')
      charts.confidenceChart = await smallChartCanvas.renderToBuffer(confidenceChart)
      console.log('✅ Confidence chart generated')
    }

    // 6. Quality Metrics Radar Chart
    const qualityMetrics = newspaper.analysisMetrics || {}
    const radarChart = {
      type: 'radar',
      data: {
        labels: [
          'Quality Score',
          'Language Diversity',
          'Content Depth',
          'Analysis Confidence'
        ],
        datasets: [{
          label: 'Newspaper Metrics',
          data: [
            qualityMetrics.qualityScore || 0,
            Math.min(Object.keys(languageData).length * 25, 100),
            Math.min((qualityMetrics.averageArticleLength || 0) / 5, 100),
            newspaper.articles ? (newspaper.articles.filter(a => a.sentimentConfidence === 'high').length / newspaper.articles.length) * 100 : 0
          ],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
        }]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: 'Overall Quality Assessment',
            font: { size: 18, weight: 'bold' }
          },
          legend: {
            display: false
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20,
              font: { size: 10 }
            },
            pointLabels: {
              font: { size: 11 }
            }
          }
        }
      }
    }

    console.log('📊 Generating quality radar chart...')
    charts.radarChart = await chartJSNodeCanvas.renderToBuffer(radarChart)
    console.log('✅ Quality radar chart generated')

    console.log('✅ All comprehensive charts generated successfully')
    return charts
  } catch (error) {
    console.error('❌ Error generating charts:', error)
    console.error('❌ Chart error stack:', error.stack)
    return {}
  }
}

// Generate comprehensive HTML content for newspaper PDF report
const generateNewspaperReportHTML = async (newspaper, chartImages = {}) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  // Convert chart images to base64
  const chartBase64 = {}
  for (const [key, buffer] of Object.entries(chartImages)) {
    if (buffer) {
      chartBase64[key] = `data:image/png;base64,${buffer.toString('base64')}`
    }
  }

  // Calculate additional metrics
  const totalArticles = newspaper.totalArticles || 0
  const sentimentData = newspaper.sentimentDistribution || { positive: 0, negative: 0, neutral: 0 }
  const languageData = newspaper.languageBreakdown || {}
  const analysisMetrics = newspaper.analysisMetrics || {}
  
  // Calculate percentages
  const positivePercentage = totalArticles > 0 ? Math.round((sentimentData.positive / totalArticles) * 100) : 0
  const negativePercentage = totalArticles > 0 ? Math.round((sentimentData.negative / totalArticles) * 100) : 0
  const neutralPercentage = totalArticles > 0 ? Math.round((sentimentData.neutral / totalArticles) * 100) : 0

  // Get top articles by sentiment
  const topPositiveArticles = newspaper.articles?.filter(a => a.contentSentiment === 'Positive').slice(0, 3) || []
  const topNegativeArticles = newspaper.articles?.filter(a => a.contentSentiment === 'Negative').slice(0, 3) || []
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive Newspaper Analysis Report | ${newspaper.newspaperName}</title>
    <style>
        @page {
            margin: 1.2cm;
            size: A4;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #2d3748;
            font-size: 11px;
            margin: 0;
            padding: 0;
        }
        
        .header {
            background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 50%, #4299e1 100%);
            color: white;
            padding: 30px 0;
            text-align: center;
            margin-bottom: 25px;
            border-radius: 8px;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 8px;
            font-weight: 700;
        }
        
        .header .subtitle {
            font-size: 1.2em;
            margin-bottom: 5px;
            opacity: 0.9;
        }
        
        .header .date {
            font-size: 0.9em;
            opacity: 0.8;
        }
        
        .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 1.5em;
            color: #1a365d;
            border-bottom: 3px solid #4299e1;
            padding-bottom: 8px;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .metric-card {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border: 2px solid #cbd5e0;
            border-radius: 10px;
            padding: 18px 12px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
        }
        
        .metric-value {
            font-size: 2.2em;
            font-weight: 800;
            color: #1a365d;
            margin-bottom: 5px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        
        .metric-label {
            color: #4a5568;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .chart-container {
            background: white;
            border-radius: 10px;
            padding: 25px;
            margin: 20px 0;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
        }
        
        .chart-container h3 {
            color: #2d3748;
            margin-bottom: 15px;
            font-size: 1.2em;
            font-weight: 600;
        }
        
        .chart-container img {
            max-width: 100%;
            height: auto;
            border-radius: 6px;
        }
        
        .chart-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        
        .summary-box {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            padding: 25px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 5px solid #0ea5e9;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .summary-box h3 {
            color: #0c4a6e;
            margin-bottom: 12px;
            font-size: 1.1em;
        }
        
        .summary-box p {
            color: #374151;
            line-height: 1.7;
        }
        
        .insights-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .insights-list li {
            background: white;
            margin: 10px 0;
            padding: 15px 18px;
            border-radius: 8px;
            border-left: 4px solid #10b981;
            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            position: relative;
        }
        
        .insights-list li:before {
            content: "✓";
            color: #10b981;
            font-weight: bold;
            margin-right: 8px;
        }
        
        .article-showcase {
            display: grid;
            grid-template-columns: 1fr;
            gap: 15px;
            margin: 20px 0;
        }
        
        .article-card {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 18px;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        
        .article-title {
            font-weight: 600;
            margin-bottom: 10px;
            color: #1f2937;
            font-size: 1.05em;
        }
        
        .article-meta {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 10px 0;
            flex-wrap: wrap;
        }
        
        .sentiment-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.75em;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .sentiment-positive { 
            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); 
            color: #065f46; 
            border: 1px solid #10b981;
        }
        .sentiment-negative { 
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); 
            color: #7f1d1d; 
            border: 1px solid #ef4444;
        }
        .sentiment-neutral { 
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); 
            color: #374151; 
            border: 1px solid #9ca3af;
        }
        
        .confidence-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.7em;
            font-weight: 600;
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e0;
        }
        
        .article-reason {
            font-size: 0.9em;
            color: #6b7280;
            margin-top: 10px;
            padding: 10px;
            background: #f9fafb;
            border-radius: 6px;
            border-left: 3px solid #d1d5db;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 20px 0;
        }
        
        .stat-item {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .stat-number {
            font-size: 1.8em;
            font-weight: 700;
            color: #1f2937;
        }
        
        .stat-label {
            font-size: 0.8em;
            color: #6b7280;
            margin-top: 5px;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        .footer-info {
            margin-top: 30px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 0.85em;
            color: #64748b;
        }
        
        .footer-info h4 {
            color: #334155;
            margin-bottom: 10px;
        }
        
        .metadata-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        
        .metadata-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📰 Comprehensive Analysis Report</h1>
        <div class="subtitle">${newspaper.newspaperName}</div>
        <div class="date">Generated on ${currentDate}</div>
    </div>

    <div class="container">
        <!-- Executive Summary -->
        <div class="section">
            <h2 class="section-title">📊 Executive Summary</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${totalArticles}</div>
                    <div class="metric-label">Total Articles</div>
                </div>

                <div class="metric-card">
                    <div class="metric-value">${newspaper.overallSentiment || 'N/A'}</div>
                    <div class="metric-label">Overall Sentiment</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${analysisMetrics.qualityScore || 0}</div>
                    <div class="metric-label">Quality Score</div>
                </div>
            </div>
            
            <div class="summary-box">
                <h3>📋 Analysis Summary</h3>
                <p>${newspaper.compiledReport?.summary || 'This comprehensive analysis provides insights into the sentiment distribution, language usage, and content quality of the newspaper articles.'}</p>
            </div>

            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-number">${positivePercentage}%</div>
                    <div class="stat-label">Positive Content</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${negativePercentage}%</div>
                    <div class="stat-label">Negative Content</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${neutralPercentage}%</div>
                    <div class="stat-label">Neutral Content</div>
                </div>
            </div>
        </div>

        <!-- Visual Analytics -->
        <div class="section">
            <h2 class="section-title">📈 Comprehensive Visual Analytics</h2>
            
            <div class="chart-grid">
                ${chartBase64.sentimentDoughnutChart ? `
                <div class="chart-container">
                    <h3>Sentiment Overview</h3>
                    <img src="${chartBase64.sentimentDoughnutChart}" alt="Sentiment Overview Chart" />
                </div>
                ` : ''}
                
                ${chartBase64.confidenceChart ? `
                <div class="chart-container">
                    <h3>Analysis Confidence</h3>
                    <img src="${chartBase64.confidenceChart}" alt="Confidence Distribution Chart" />
                </div>
                ` : ''}
            </div>
            
            ${chartBase64.languageChart ? `
            <div class="chart-container">
                <h3>Language Distribution Analysis</h3>
                <img src="${chartBase64.languageChart}" alt="Language Distribution Chart" />
            </div>
            ` : ''}
            
            ${chartBase64.lengthChart ? `
            <div class="chart-container">
                <h3>Article Length Distribution</h3>
                <img src="${chartBase64.lengthChart}" alt="Article Length Chart" />
            </div>
            ` : ''}
            
            ${chartBase64.radarChart ? `
            <div class="chart-container">
                <h3>Overall Quality Assessment</h3>
                <img src="${chartBase64.radarChart}" alt="Quality Radar Chart" />
            </div>
            ` : ''}
        </div>

        <!-- Key Findings -->
        <div class="section">
            <h2 class="section-title">💡 Key Findings & Insights</h2>
            <ul class="insights-list">
                ${(newspaper.compiledReport?.keyFindings || [
                  `Analyzed ${totalArticles} articles with ${positivePercentage}% positive sentiment`,
                  `Dominant language: ${newspaper.dominantLanguage || 'Mixed'}`,
                  `Overall quality score: ${analysisMetrics.qualityScore || 0}/100`,
                  `Average article length: ${analysisMetrics.averageArticleLength || 0} words`
                ]).map(finding => `<li>${finding}</li>`).join('')}
            </ul>
        </div>

        <!-- Article Showcase -->
        <div class="section page-break">
            <h2 class="section-title">📰 Featured Article Analysis</h2>
            
            ${topPositiveArticles.length > 0 ? `
            <h3 style="color: #059669; margin-bottom: 15px;">🌟 Top Positive Articles</h3>
            <div class="article-showcase">
                ${topPositiveArticles.map(article => `
                    <div class="article-card">
                        <div class="article-title">${article.title}</div>
                        <div class="article-meta">
                            <span class="sentiment-badge sentiment-positive">Positive</span>
                            <span class="confidence-badge">${article.sentimentConfidence} confidence</span>
                            <span style="font-size: 0.8em; color: #6b7280;">${article.wordCount} words</span>
                        </div>
                        ${article.contentSentimentReason ? `
                        <div class="article-reason">
                            <strong>Analysis:</strong> ${article.contentSentimentReason}
                        </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            ${topNegativeArticles.length > 0 ? `
            <h3 style="color: #dc2626; margin: 25px 0 15px 0;">⚠️ Top Negative Articles</h3>
            <div class="article-showcase">
                ${topNegativeArticles.map(article => `
                    <div class="article-card">
                        <div class="article-title">${article.title}</div>
                        <div class="article-meta">
                            <span class="sentiment-badge sentiment-negative">Negative</span>
                            <span class="confidence-badge">${article.sentimentConfidence} confidence</span>
                            <span style="font-size: 0.8em; color: #6b7280;">${article.wordCount} words</span>
                        </div>
                        ${article.contentSentimentReason ? `
                        <div class="article-reason">
                            <strong>Analysis:</strong> ${article.contentSentimentReason}
                        </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>

        <!-- Recommendations -->
        <div class="section">
            <h2 class="section-title">📋 Strategic Recommendations</h2>
            <ul class="insights-list">
                ${(newspaper.compiledReport?.recommendations || [
                  'Monitor sentiment trends to maintain editorial balance',
                  'Consider diversifying content to improve engagement',
                  'Focus on quality metrics to enhance reader experience',
                  'Analyze language distribution for target audience alignment'
                ]).map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>

        <!-- Technical Details -->
        <div class="footer-info">
            <h4>📋 Report Metadata</h4>
            <div class="metadata-grid">
                <div class="metadata-item">
                    <span>File Size:</span>
                    <span>${(newspaper.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <div class="metadata-item">
                    <span>Upload Date:</span>
                    <span>${new Date(newspaper.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="metadata-item">
                    <span>Analysis Date:</span>
                    <span>${newspaper.reportGeneratedAt ? new Date(newspaper.reportGeneratedAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div class="metadata-item">
                    <span>Processing Status:</span>
                    <span>${newspaper.processingStatus}</span>
                </div>
            </div>
            <p style="margin-top: 15px; font-style: italic;">
                This report was generated using advanced AI sentiment analysis and natural language processing techniques. 
                Results are based on automated analysis and should be interpreted alongside human editorial judgment.
            </p>
        </div>
    </div>
</body>
</html>
  `
}
