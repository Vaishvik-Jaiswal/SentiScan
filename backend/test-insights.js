import newspaperProcessor from './services/newspaperProcessor.js'

// Test the insights extraction functionality
const testInsights = () => {
  const processor = newspaperProcessor
  
  // Test political insights
  const politicalText = "According to the latest survey, BJP has 45% support while Congress has 38% support. The voter turnout was recorded at 67%."
  console.log('🗳️ Testing Political Insights:')
  const politicalInsights = processor.extractArticleInsights("Election Survey Results", politicalText)
  console.log(politicalInsights)
  console.log('')
  
  // Test economic insights
  const economicText = "The GDP growth rate increased to 6.5% this quarter. Inflation rate stands at 4.2% while unemployment rate is at 7.8%."
  console.log('💰 Testing Economic Insights:')
  const economicInsights = processor.extractArticleInsights("Economic Growth Report", economicText)
  console.log(economicInsights)
  console.log('')
  
  // Test health insights
  const healthText = "COVID-19 cases reported at 1,500 today. The vaccination rate has reached 78% of the population."
  console.log('🏥 Testing Health Insights:')
  const healthInsights = processor.extractArticleInsights("Health Update", healthText)
  console.log(healthInsights)
  console.log('')
  
  // Test business insights
  const businessText = "The company reported revenue of ₹5000 crore this quarter. A major merger deal worth ₹2000 crore was announced. The firm is hiring 5000 new employees."
  console.log('🏢 Testing Business Insights:')
  const businessInsights = processor.extractArticleInsights("Business News", businessText)
  console.log(businessInsights)
  console.log('')
  
  // Test enhanced summary
  const summaryText = "The local community gathered for the annual festival celebration. People enjoyed traditional food and cultural performances. The event was organized by the neighborhood committee."
  console.log('📄 Testing Enhanced Summary:')
  const summaryResult = processor.extractArticleInsights("Community Festival", summaryText)
  console.log(summaryResult)
  console.log('')
  
  // Test no insights
  const noInsightsText = "This is a simple article about daily life without any specific data or statistics."
  console.log('❌ Testing No Insights:')
  const noInsights = processor.extractArticleInsights("Daily Life", noInsightsText)
  console.log(noInsights)
}

testInsights()