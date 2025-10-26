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

// Background function to process newspaper analysis
const processNewspaperAnalysis = async (newspaperId, filePath) => {
  console.log(`📰 Starting newspaper analysis for ${newspaperId}...`)
  
  try {
    // Update status to processing
    await Newspaper.findByIdAndUpdate(newspaperId, {
      processingStatus: 'processing'
    })

    const newspaper = await Newspaper.findById(newspaperId)
    if (!newspaper) {
      console.error(`❌ Newspaper not found: ${newspaperId}`)
      return
    }

    // Process newspaper using dedicated processor
    console.log('📰 Processing newspaper with advanced extraction and analysis...')
    const processingResult = await newspaperProcessor.processNewspaper(filePath, newspaper.newspaperName)
    
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
      summary: `Comprehensive analysis of "${newspaper.newspaperName}" containing ${totalArticles} articles with an overall ${overallMetrics.summary.overallSentiment.toLowerCase()} sentiment (Score: ${overallMetrics.summary.sentimentScore}/100). The analysis reveals a quality score of ${overallMetrics.summary.qualityScore}/100 with ${dominantLanguage} as the dominant language.`,
      keyFindings: [
        `${totalArticles} articles analyzed with ${overallMetrics.sentimentDistribution.counts.positive} positive, ${overallMetrics.sentimentDistribution.counts.negative} negative, and ${overallMetrics.sentimentDistribution.counts.neutral} neutral articles`,
        `Overall sentiment: ${overallMetrics.summary.overallSentiment} (Score: ${overallMetrics.summary.sentimentScore}/100)`,
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
        contentSentiment: article.contentSentiment,
        contentSentimentReason: article.contentSentimentReason,
        sentimentConfidence: article.sentimentConfidence,
        detectedLanguage: article.language,
        wordCount: article.wordCount,
        pageNumber: 1, // Will be enhanced later
        position: article.startIndex || 0,
      })),
      totalArticles: analyzedArticles.length,
      overallSentiment: overallMetrics.summary.overallSentiment,
      sentimentDistribution: overallMetrics.sentimentDistribution.counts,
      sentimentScore: overallMetrics.summary.sentimentScore,
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

// Generate chart images for newspaper PDF report
const generateNewspaperChartImages = async (newspaper) => {
  console.log('📊 Starting chart generation...')
  const charts = {}

  try {
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
      width: 800, 
      height: 400,
      backgroundColour: 'white'
    })

    // Ensure sentiment distribution data exists
    const sentimentData = newspaper.sentimentDistribution || { positive: 0, negative: 0, neutral: 0 }
    console.log('📊 Sentiment data:', sentimentData)

    // Sentiment Distribution Pie Chart
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
            font: { size: 16 }
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    }
    
    console.log('📊 Generating sentiment chart...')
    charts.sentimentChart = await chartJSNodeCanvas.renderToBuffer(sentimentChart)
    console.log('✅ Sentiment chart generated')

    // Language Distribution Bar Chart
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
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: false,
          plugins: {
            title: {
              display: true,
              text: 'Language Distribution',
              font: { size: 16 }
            },
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      }
      
      console.log('📊 Generating language chart...')
      charts.languageChart = await chartJSNodeCanvas.renderToBuffer(languageChart)
      console.log('✅ Language chart generated')
    } else {
      console.log('⚠️ No language data available for chart')
    }

    console.log('✅ All charts generated successfully')
    return charts
  } catch (error) {
    console.error('❌ Error generating charts:', error)
    console.error('❌ Chart error stack:', error.stack)
    return {}
  }
}

// Generate HTML content for newspaper PDF report
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
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Newspaper Analysis Report | ${newspaper.newspaperName}</title>
    <style>
        /* Similar styles to news comparison report but adapted for newspaper analysis */
        @page {
            margin: 1.5cm;
            size: A4;
        }
        
        body {
            font-family: 'Segoe UI', sans-serif;
            line-height: 1.5;
            color: #2d3748;
            font-size: 12px;
        }
        
        .header {
            background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%);
            color: white;
            padding: 40px 0;
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 2.2em;
            margin-bottom: 10px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 0 30px;
        }
        
        .section {
            margin-bottom: 35px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 1.4em;
            color: #1a365d;
            border-bottom: 2px solid #4299e1;
            padding-bottom: 8px;
            margin-bottom: 20px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .metric-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 20px 15px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.08);
        }
        
        .metric-value {
            font-size: 2em;
            font-weight: 700;
            color: #1a365d;
            margin-bottom: 5px;
        }
        
        .metric-label {
            color: #718096;
            font-size: 0.85em;
        }
        
        .chart-container {
            background: white;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.08);
            border: 1px solid #e2e8f0;
        }
        
        .chart-container img {
            max-width: 100%;
            height: auto;
        }
        
        .article-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 15px;
            margin: 20px 0;
        }
        
        .article-card {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 15px;
            background: white;
        }
        
        .article-title {
            font-weight: 600;
            margin-bottom: 8px;
            color: #2d3748;
        }
        
        .sentiment-badge {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.7em;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .sentiment-positive { background: #c6f6d5; color: #22543d; }
        .sentiment-negative { background: #fed7d7; color: #742a2a; }
        .sentiment-neutral { background: #e2e8f0; color: #2d3748; }
        
        .insights-list {
            list-style: none;
            padding: 0;
        }
        
        .insights-list li {
            background: white;
            margin: 8px 0;
            padding: 12px 15px;
            border-radius: 6px;
            border-left: 3px solid #4299e1;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Newspaper Analysis Report</h1>
        <div class="subtitle">${newspaper.newspaperName}</div>
        <div>Generated on ${currentDate}</div>
    </div>

    <div class="container">
        <!-- Executive Summary -->
        <div class="section">
            <h2 class="section-title">📊 Executive Summary</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${newspaper.totalArticles}</div>
                    <div class="metric-label">Total Articles</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${newspaper.sentimentScore}/100</div>
                    <div class="metric-label">Sentiment Score</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${newspaper.overallSentiment}</div>
                    <div class="metric-label">Overall Sentiment</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${newspaper.analysisMetrics?.qualityScore || 0}/100</div>
                    <div class="metric-label">Quality Score</div>
                </div>
            </div>
            
            <div style="background: #f7fafc; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin-bottom: 10px;">Summary</h3>
                <p>${newspaper.compiledReport?.summary || 'Analysis summary not available.'}</p>
            </div>
        </div>

        <!-- Visual Analytics -->
        <div class="section">
            <h2 class="section-title">📈 Visual Analytics</h2>
            
            ${chartBase64.sentimentChart ? `
            <div class="chart-container">
                <h3>Sentiment Distribution</h3>
                <img src="${chartBase64.sentimentChart}" alt="Sentiment Distribution Chart" />
            </div>
            ` : ''}
            
            ${chartBase64.languageChart ? `
            <div class="chart-container">
                <h3>Language Distribution</h3>
                <img src="${chartBase64.languageChart}" alt="Language Distribution Chart" />
            </div>
            ` : ''}
        </div>

        <!-- Key Findings -->
        <div class="section">
            <h2 class="section-title">💡 Key Findings</h2>
            <ul class="insights-list">
                ${(newspaper.compiledReport?.keyFindings || ['No findings available']).map(finding => `<li>${finding}</li>`).join('')}
            </ul>
        </div>

        <!-- Sample Articles -->
        <div class="section">
            <h2 class="section-title">📰 Sample Articles</h2>
            <div class="article-grid">
                ${newspaper.articles.slice(0, 5).map(article => `
                    <div class="article-card">
                        <div class="article-title">${article.title}</div>
                        <div style="margin: 8px 0;">
                            <span class="sentiment-badge sentiment-${article.contentSentiment.toLowerCase()}">
                                ${article.contentSentiment}
                            </span>
                            <span style="margin-left: 10px; font-size: 0.8em; color: #718096;">
                                ${article.wordCount} words • ${article.detectedLanguage}
                            </span>
                        </div>
                        <div style="font-size: 0.85em; color: #4a5568; margin-top: 8px;">
                            ${article.contentSentimentReason || 'No analysis reason available'}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Recommendations -->
        <div class="section">
            <h2 class="section-title">📋 Recommendations</h2>
            <ul class="insights-list">
                ${(newspaper.compiledReport?.recommendations || ['Continue monitoring content quality and editorial balance']).map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    </div>
</body>
</html>
  `
}
