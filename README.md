# DevSync AI - Backend

Express.js backend server for DevSync AI, powered by IBM Bob AI.

## 🚀 Features

- **IBM Bob Integration**: Proxy routes for all Bob AI interactions
- **Authentication**: Supabase Auth with JWT
- **Session Management**: Track and store all Bob interactions
- **Export Reports**: Generate comprehensive usage reports
- **Real-time Analytics**: Metrics and statistics tracking

## 📋 Prerequisites

- Node.js 16+ 
- npm or yarn
- Supabase account
- Environment variables configured

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Configure .env with your values
```

## 🔧 Environment Variables

Create a `.env` file with:

```env
NODE_ENV=development
PORT=3001
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=http://localhost:5173
```

## 🏃 Running Locally

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server will start on `http://localhost:3001`

## 📁 Project Structure

```
backend/
├── index.js              # Main server file
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── bob.js           # IBM Bob proxy routes
│   ├── sessions.js      # Session management
│   └── export.js        # Report export
├── middleware/
│   └── auth.js          # JWT authentication middleware
└── utils/
    ├── codeAnalyzer.js  # Code analysis utilities
    ├── codeTransformer.js # Code transformation logic
    └── githubAnalyzer.js  # GitHub repository analysis
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Bob AI Features
- `POST /api/bob/onboard` - Code onboarding analysis
- `POST /api/bob/document` - Documentation generation
- `POST /api/bob/automate` - Task automation

### Sessions
- `GET /api/sessions` - Get user sessions
- `GET /api/sessions/metrics/summary` - Get metrics summary
- `GET /api/sessions/stats/daily` - Get daily statistics

### Export
- `GET /api/export/report` - Export full report (JSON)
- `GET /api/export/report/summary` - Get report summary
- `POST /api/export/report/custom` - Custom filtered report

## 🚀 Deployment

### Render (Recommended)

1. Push code to GitHub
2. Connect repository to Render
3. Configure environment variables
4. Deploy

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

## 🔒 Security

- JWT authentication on all protected routes
- Row Level Security (RLS) in Supabase
- CORS configured for frontend origin
- Environment variables for sensitive data
- Helmet.js for security headers

## 📊 Database

Uses Supabase PostgreSQL with:
- `bob_sessions` - All Bob interactions
- `metrics` - Aggregated user metrics
- `daily_stats` - Daily statistics
- `user_preferences` - User settings

Run `MIGRATION_SCRIPT.sql` to set up the database.

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Change PORT in .env or kill the process
lsof -ti:3001 | xargs kill -9
```

**Database connection errors:**
- Verify Supabase credentials
- Check if Supabase project is active
- Run migration script

**CORS errors:**
- Update FRONTEND_URL in .env
- Restart server after changes

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

Made with ❤️ using IBM Bob AI