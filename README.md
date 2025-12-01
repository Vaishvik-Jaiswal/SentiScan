# SentiScan - AI-Powered Multilingual Sentiment Analysis

SentiScan is a comprehensive web application that provides AI-powered sentiment analysis for multilingual documents. Built with the MERN stack and integrated with Azure services, it supports English, Hindi, Gujarati, and Telugu languages.

## 🌟 Features

- **Multi-format Support**: Upload PDF, DOCX, and TXT files
- **Multilingual Analysis**: Supports English, Hindi, Gujarati, and Telugu languages
- **AI-Powered**: Uses Azure OpenAI for accurate sentiment classification
- **Secure Storage**: Files stored in Azure Blob Storage
- **Rich Analytics**: Interactive charts and visualizations
- **Real-time Processing**: Background processing with status updates
- **User Authentication**: JWT-based secure authentication
- **Responsive Design**: Modern UI with dark mode support

## 🏗️ Architecture

### Backend Stack
- **Node.js & Express**: RESTful API server
- **MongoDB**: Document database with Mongoose ODM
- **Azure OpenAI**: Sentiment analysis AI service
- **Azure Blob Storage**: Secure file storage
- **JWT**: Authentication and authorization
- **Multer**: File upload handling
- **PDF-Parse & Mammoth**: Text extraction from documents

### Frontend Stack
- **React 19**: Modern UI framework
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Chart.js**: Interactive data visualizations
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls
- **React Toastify**: User notifications

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud)
- Azure OpenAI API access
- Azure Storage Account

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/senti-scan.git
cd senti-scan
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:
```env
# Database
MONGO_URI=mongodb://localhost:27017/sentiscan

# JWT
JWT_SECRET=your_jwt_secret_key_here_make_it_long_and_secure

# Azure OpenAI
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name_here
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_storage_account_key
AZURE_STORAGE_CONTAINER_NAME=sentiscan-uploads

# Server
PORT=4000
NODE_ENV=development
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

Create a `.env` file in the frontend directory:
```env
# API Base URL
VITE_API_URL=http://localhost:4000

# App Configuration
VITE_APP_NAME=SentiScan
VITE_APP_DESCRIPTION=AI-Powered Multilingual Sentiment Analysis
```

Start the frontend development server:
```bash
npm run dev
```

### 4. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 🔧 Configuration

### Azure OpenAI Setup
1. Create an Azure OpenAI resource in the Azure portal
2. Deploy a GPT model (e.g., GPT-3.5-turbo or GPT-4)
3. Get your API key, endpoint, and deployment name
4. Update the `.env` file with your Azure OpenAI credentials

### Azure Blob Storage Setup
1. Create a Storage Account in Azure
2. Create a container named `sentiscan-uploads`
3. Get your storage account name and access key
4. Update the `.env` file with your storage credentials

### MongoDB Setup
- **Local**: Install MongoDB locally and use `mongodb://localhost:27017/sentiscan`
- **Cloud**: Use MongoDB Atlas and replace with your connection string

## 📚 API Endpoints

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get user profile (protected)

### Articles
- `POST /api/articles/upload` - Upload and process article (protected)
- `GET /api/articles` - Get user's articles (protected)
- `GET /api/articles/:id` - Get article by ID (protected)
- `DELETE /api/articles/:id` - Delete article (protected)
- `GET /api/articles/analytics` - Get analytics data (protected)

## 🎯 Usage Flow

1. **Register/Login**: Create an account or sign in
2. **Upload Document**: Upload PDF, DOCX, or TXT file
3. **Processing**: System extracts text and detects language
4. **AI Analysis**: Azure OpenAI analyzes sentiment
5. **View Results**: Access analytics and detailed results

## 📊 Analytics Features

- **Sentiment Distribution**: Pie chart showing sentiment breakdown
- **Language Analysis**: Bar chart of language distribution
- **Trend Analysis**: Line chart of sentiment over time
- **Detailed Reports**: Individual article analysis with full content

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected routes and API endpoints
- Secure file storage in Azure
- Input validation and sanitization

## 🌐 Deployment

### Backend Deployment
1. Set up environment variables on your hosting platform
2. Ensure MongoDB and Azure services are accessible
3. Deploy using platforms like Heroku, Railway, or DigitalOcean

### Frontend Deployment
1. Update `VITE_API_URL` to your production backend URL
2. Build the project: `npm run build`
3. Deploy to Netlify, Vercel, or similar platforms

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🙏 Acknowledgments

- Azure OpenAI for powerful sentiment analysis
- Chart.js for beautiful data visualizations
- Tailwind CSS for modern styling
- React and Node.js communities

## 📞 Support

For support, email kashyapkshitij7704@gmail.com or create an issue on GitHub.

---

**Built with ❤️ by [Kshitij Kashyap](https://kshitij-kashyap-portfolio.netlify.app/)**
