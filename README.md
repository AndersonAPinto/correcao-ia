# Corretor 80/20 - AI-Powered Grading Assistant

An intelligent grading system that uses AI (Gemini) to automatically grade student answers from photos via OCR and natural language processing.

## 🎯 Features

- **User Authentication**: Email/password registration and login
- **Credit System**: Each grading costs 3 credits (new users get 10 free credits)
- **Answer Keys (Gabaritos)**: Create and manage grading criteria
- **Image Upload**: Upload photos of student answers
- **AI Grading**: Automatic OCR + grading via Gemini AI through N8N workflow
- **Results Dashboard**: View grades, feedback, and OCR transcriptions
- **Settings Management**: Configure Gemini API key and N8N webhook URL

## 🏗️ Architecture

```
Frontend (Next.js)
    ↓
Backend API (Next.js API Routes)
    ↓
MongoDB (Data Storage)
    ↓
N8N Workflow
    ↓
Gemini AI (OCR + Grading)
    ↓
Results → Backend → Frontend
```

## 📦 Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: MongoDB
- **Auth**: JWT with bcryptjs
- **AI**: Google Gemini API (via N8N)
- **Orchestration**: N8N (workflow automation)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running on localhost:27017
- N8N instance (cloud or self-hosted)
- Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Installation

1. **Install dependencies**:
```bash
cd /app
yarn install
```

2. **Configure environment** (already set in `.env`):
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=corretor_80_20
NEXT_PUBLIC_BASE_URL=https://correct80-20.preview.emergentagent.com
```

3. **Start the application**:
```bash
yarn dev
```

The app will be available at `http://localhost:3000`

## 📖 Usage Guide

### 1. First Time Setup

1. **Register an account** - You'll receive 10 free credits
2. **Go to Settings tab** and configure:
   - **Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - **N8N Webhook URL**: Your N8N workflow webhook (see N8N setup below)

### 2. Create Answer Keys

1. Go to **Answer Keys** tab
2. Click **Create New Answer Key**
3. Enter:
   - **Title**: e.g., "Math Quiz - Chapter 5"
   - **Content**: The correct answer or grading criteria
4. Click **Create**

### 3. Grade Student Answers

1. Go to **Dashboard** tab
2. Select an answer key from dropdown
3. Upload a photo of the student's answer
4. Click **Upload & Grade** (costs 3 credits)
5. View results in **Results** tab (processing takes 5-15 seconds)

### 4. View Results

1. Go to **Results** tab
2. See all graded assessments with:
   - Grade (0-10)
   - AI feedback
   - OCR transcription (click to expand)
   - Status (pending/completed)

## 🔧 N8N Workflow Setup

The grading workflow requires N8N to orchestrate the AI grading process. See detailed instructions in:

📄 **[N8N_WORKFLOW_GUIDE.md](./N8N_WORKFLOW_GUIDE.md)**

Quick summary:
1. Create a new workflow in N8N
2. Add these nodes:
   - Webhook (receive request)
   - HTTP Request (download image)
   - Gemini API (OCR + grading)
   - Code (parse response)
   - HTTP Request (send results back)
3. Activate workflow
4. Copy webhook URL to app settings

## 🗄️ Database Schema

### Collections

**users**
```javascript
{
  id: UUID,
  email: String,
  password: String (hashed),
  name: String,
  createdAt: Date
}
```

**creditos**
```javascript
{
  id: UUID,
  userId: UUID (ref: users),
  saldoAtual: Number,
  createdAt: Date
}
```

**transacoes_creditos**
```javascript
{
  id: UUID,
  userId: UUID,
  tipo: "credito" | "debito",
  quantidade: Number,
  descricao: String,
  createdAt: Date
}
```

**gabaritos** (Answer Keys)
```javascript
{
  id: UUID,
  userId: UUID,
  titulo: String,
  conteudo: String,
  createdAt: Date
}
```

**avaliacoes_corrigidas** (Grading Results)
```javascript
{
  id: UUID,
  userId: UUID,
  gabaritoId: UUID,
  imageUrl: String,
  textoOcr: String,
  nota: Number (0-10),
  feedback: String,
  status: "pending" | "completed",
  createdAt: Date,
  completedAt: Date
}
```

**settings**
```javascript
{
  id: UUID,
  userId: UUID,
  geminiApiKey: String,
  n8nWebhookUrl: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Credits
- `GET /api/credits` - Get credit balance (requires auth)

### Settings
- `GET /api/settings` - Get user settings (requires auth)
- `PUT /api/settings` - Update settings (requires auth)

### Answer Keys
- `POST /api/gabaritos` - Create answer key (requires auth)
- `GET /api/gabaritos` - List answer keys (requires auth)

### Grading
- `POST /api/upload` - Upload student answer (requires auth, multipart/form-data)
- `GET /api/avaliacoes` - List grading results (requires auth)

### Webhook (for N8N)
- `POST /api/webhook/result` - Receive grading results from N8N

## 🧪 Testing

### Manual API Testing

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Get credits (replace TOKEN)
curl -X GET http://localhost:3000/api/credits \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔒 Security Notes

- Passwords are hashed with bcryptjs
- JWTs expire after 7 days
- All authenticated endpoints require Bearer token
- User data is isolated by userId
- Image uploads are stored in `/public/uploads`
- **Production TODO**: Add HTTPS, rate limiting, file size limits, webhook authentication

## 💰 Credit System

- **New users**: 10 credits
- **Per grading**: -3 credits
- **Future**: Add credit purchase functionality
- Credits are deducted atomically before processing

## 🎨 UI Components

Built with shadcn/ui components:
- Button, Card, Input, Label, Textarea
- Select, Tabs, Toast notifications
- Fully responsive design
- Beautiful gradient backgrounds

## 📝 Notes

### MVP Approach (80/20)

**Included:**
- ✅ Basic auth (email/password)
- ✅ Credit system with transactions
- ✅ Answer key management
- ✅ Image upload with validation
- ✅ N8N webhook integration
- ✅ Results display

**Not Included (Technical Debt):**
- ❌ Google OAuth (can add later)
- ❌ OCR validation screen (auto-accepts AI result)
- ❌ Credit purchase system
- ❌ Advanced security (rate limiting, CSRF)
- ❌ File storage on S3/cloud (uses local storage)
- ❌ Email notifications
- ❌ Advanced analytics

## 🐛 Troubleshooting

### Upload fails with "N8N webhook URL not configured"
- Go to Settings tab and add your N8N webhook URL

### Upload fails with "Insufficient credits"
- You need at least 3 credits. Contact admin to add more credits manually via MongoDB

### Results stuck in "pending" status
- Check N8N workflow execution logs
- Verify webhook URL is correct
- Ensure Gemini API key is valid in N8N

### MongoDB connection error
- Ensure MongoDB is running: `sudo supervisorctl status mongodb`
- Check MONGO_URL in `.env` file

### Frontend not loading
- Check Next.js logs: `tail -f /var/log/supervisor/nextjs.out.log`
- Restart services: `sudo supervisorctl restart all`

## 🚀 Future Enhancements

1. **Google OAuth** for easier login
2. **Credit purchase** via Stripe/PayPal
3. **Bulk upload** for multiple students
4. **Class management** with student groups
5. **Analytics dashboard** with statistics
6. **Export results** to PDF/Excel
7. **Mobile app** version
8. **Real-time updates** with WebSockets
9. **Direct Gemini integration** (skip N8N for simpler deployment)

## 📄 License

MIT License - Feel free to use and modify for your needs!

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review N8N workflow logs
3. Check browser console for frontend errors
4. Review backend logs in `/var/log/supervisor/nextjs.out.log`

---

Built with ❤️ for educators and students
