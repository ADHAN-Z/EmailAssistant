# 📧 Email Assistant - AI-Powered Task Management

A Next.js application that intelligently extracts actionable tasks from your Gmail emails using AI and provides interview preparation features.

## ✨ Features

- **🤖 AI Email Analysis**: Automatically extracts tasks, deadlines, and interviews from Gmail emails using LangChain and OpenAI
- **📋 Smart Task Management**: Organize tasks by priority, type, and deadline with drag-and-drop functionality
- **🎯 Interview Preparation**: Generate tailored interview questions based on company and role
- **🔐 Secure Authentication**: Google OAuth integration with NextAuth.js
- **⚡ Real-time Sync**: Sync emails and extract tasks in real-time
- **📊 Dashboard Analytics**: Track your productivity with task statistics
- **🎨 Modern UI**: Beautiful, responsive interface built with Tailwind CSS and shadcn/ui

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Authentication**: NextAuth.js with Google OAuth
- **Database**: PostgreSQL with Prisma ORM
- **AI/ML**: LangChain, OpenAI GPT-4
- **Email Integration**: Gmail API
- **Caching**: Redis (Upstash)
- **Rate Limiting**: Upstash Rate Limiting
- **Deployment**: Docker, Vercel-ready

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Redis instance (for caching and rate limiting)
- Google Cloud Console project with Gmail API enabled
- OpenAI API key

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ADHAN-Z/EmailAssistant.git
   cd EmailAssistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/email_assistant"
   DIRECT_URL="postgresql://username:password@localhost:5432/email_assistant"

   # NextAuth
   NEXTAUTH_SECRET="your-32-character-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"

   # Google OAuth
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"

   # OpenAI
   OPENAI_API_KEY="your-openai-api-key"

   # Redis (optional, for caching and rate limiting)
   REDIS_URL="redis://localhost:6379"

   # Sentry (optional, for error monitoring)
   SENTRY_DSN="your-sentry-dsn"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
6. Copy the Client ID and Client Secret to your environment variables

## 📁 Project Structure

```
EmailAssistant/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── auth/                 # NextAuth configuration
│   │   ├── gmail/                # Gmail sync endpoints
│   │   ├── interviews/           # Interview prep endpoints
│   │   └── tasks/                # Task management endpoints
│   ├── dashboard/                # Dashboard pages
│   └── globals.css               # Global styles
├── components/                   # React components
│   ├── dashboard/                # Dashboard-specific components
│   ├── interview/                # Interview prep components
│   └── ui/                       # Reusable UI components
├── lib/                          # Utility libraries
│   ├── langchain/                # AI processing modules
│   ├── cache.ts                  # Redis caching
│   ├── errors.ts                 # Error handling
│   ├── logger.ts                 # Logging utility
│   ├── prisma.ts                 # Database client
│   └── rate-limit.ts             # Rate limiting
├── prisma/                       # Database schema and migrations
├── types/                        # TypeScript type definitions
└── public/                       # Static assets
```

## 🚀 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run build:turbo` - Build with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🐳 Docker Deployment

1. **Build the Docker image**
   ```bash
   docker build -t EmailAssistant .
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔒 Security Features

- **Rate Limiting**: Prevents API abuse with configurable limits
- **Input Validation**: Zod schemas for all API inputs
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **XSS Protection**: Security headers and input sanitization
- **CSRF Protection**: NextAuth.js built-in CSRF protection
- **Environment Validation**: Strict environment variable validation

## 📊 Performance Optimizations

- **Caching**: Redis-based caching for frequently accessed data
- **Database Indexing**: Optimized queries with proper indexes
- **Code Splitting**: Dynamic imports for better bundle size
- **Image Optimization**: Next.js automatic image optimization
- **Bundle Analysis**: Webpack bundle analyzer integration

## 🧪 Testing

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Run build test
npm run build
```

## 📈 Monitoring & Observability

- **Structured Logging**: JSON-formatted logs with context
- **Error Tracking**: Sentry integration for error monitoring
- **Health Checks**: `/api/health` endpoint for monitoring
- **Performance Metrics**: Built-in Next.js analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in environment variables
   - Run `npx prisma db push` to sync schema

2. **Google OAuth Issues**
   - Verify Google Cloud Console configuration
   - Check redirect URIs match your domain
   - Ensure Gmail API is enabled

3. **OpenAI API Issues**
   - Verify API key is correct
   - Check API usage limits
   - Ensure sufficient credits

4. **Redis Connection Issues**
   - Ensure Redis server is running
   - Check REDIS_URL in environment variables
   - Verify network connectivity


## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Email templates and automation
- [ ] Team collaboration features
- [ ] Advanced analytics dashboard
- [ ] Integration with other email providers
- [ ] Voice-to-task functionality
- [ ] Calendar integration

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [LangChain](https://langchain.com/) - AI application framework
- [OpenAI](https://openai.com/) - AI language models
- [Prisma](https://prisma.io/) - Database toolkit
- [shadcn/ui](https://ui.shadcn.com/) - UI component library

---
