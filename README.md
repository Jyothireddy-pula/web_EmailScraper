# AI Email Scraper

## 🚀 Features
- **📧 Smart Email Search**: Search your Gmail with natural language
- **🤖 AI-Powered Summaries**: Get intelligent email analysis with Gemini/ChatGPT
- **📝 Humanized Auto-Replies**: Generate professional responses automatically
- **🌍 Multi-Language Support**: English, Hindi, Telugu
- **🎯 Smart Categorization**: Academic, Placement, Announcements, Others
- **📊 Dashboard Analytics**: Track important emails and deadlines

## 🔧 How to Use
1. **Connect Gmail**: Click "Connect your Gmail" button
2. **Search Emails**: Type keywords or use natural language
3. **Generate Summary**: Click 📝 on any email for AI summary
4. **Create Reply**: Click 🤖 to generate intelligent replies
5. **Send Response**: Send directly from your Gmail account

## 🛠️ Technical Stack
- **Frontend**: React with Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: MongoDB for email caching
- **AI Services**: Google Gemini & OpenAI ChatGPT
- **Authentication**: Google OAuth2

## 🌐 Live Demo
Coming soon! Deploy your own instance using the instructions below.

## � Quick Setup (100% Working)

### 1. Clone & Install
```bash
git clone https://github.com/Jyothireddy-pula/web_EmailScraper.git
cd web_EmailScraper

# Frontend
cd frontend && npm install

# Backend  
cd ../backend && npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp ../env.example .env

# Edit .env with your credentials:
# - MONGO_URI: MongoDB connection string
# - GOOGLE_CLIENT_ID: From Google Cloud Console
# - GOOGLE_CLIENT_SECRET: From Google Cloud Console
```

### 3. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add redirect URIs:
   - `http://localhost:5000/auth/callback` (development)
   - `https://email-scraper-backend-pht5.onrender.com/auth/callback` (production)

### 4. Start Application
```bash
# Terminal 1: Start Backend
cd backend && npm start

# Terminal 2: Start Frontend  
cd frontend && npm run dev
```

### 5. Access & Use
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Click "Connect your Gmail" → Authenticate → Start using!

## 🔐 Privacy & Security
- **No Email Storage**: Emails are not stored on our servers
- **Secure OAuth**: Uses Google's secure authentication
- **Local Processing**: AI processing happens in your browser
- **API Key Protection**: Your AI API keys are stored locally

## 📄 Legal
- [Privacy Policy](./PRIVACY_POLICY.md)
- [Terms of Service](./TERMS_OF_SERVICE.md)

## 🤝 Contributing
Open source project. Contributions welcome!

## 📧 Contact
For support: jyothi.23bce7882@vitapstudent.ac.in
