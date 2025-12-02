# AI Email Assistant – Full-Stack Application

This project is an AI-powered email assistant built using **FastAPI**, **Next.js**, **Google OAuth**, **Gmail API**, and **Gemini 2.5 Flash**. The system allows users to authenticate using Google, read their latest Gmail messages, view AI-generated summaries, generate replies using Gemini, delete emails, and interact with the system via a chat-style interface.

The **frontend is deployed on Vercel**, and the **backend is deployed on Render**.

## 🚀 Features

### 🔐 Google OAuth Login
- Secure login via Google OAuth 2.0
- Uses Gmail scopes for reading, sending, and deleting emails
- Session stored using `httponly` cookies

### ✉️ Fetch & Summarize Emails
- Retrieves last 5 Gmail messages via Gmail API
- Supports nested MIME body formats
- AI summarizes each email using Gemini

### ✍️ AI Email Reply
- Generates professional, contextual replies using Gemini
- Replies are sent to the original sender (not back to the user)
- Uses Gmail API `messages.send`

### 🗑 Delete Emails
- Deletes emails directly from Gmail inbox

### 💬 Chat-Based Interface
Supported commands:
```
read emails
show last 5
reply 1
delete 2
```

## 🧩 Tech Stack

### Frontend (Vercel)
- Next.js 14 (App Router)
- TailwindCSS
- React
- Fetch API with cookies (`credentials: include`)

### Backend (Render)
- FastAPI
- httpx (async Gmail API calls)
- Google OAuth 2.0
- Gmail API
- Gemini 2.5 Flash (Generative AI)
- Deployed as a Render Web Service

## 📦 Environment Variables

### Frontend (`.env.local`)
```
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
```

### Backend (`.env` on Render)
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-backend.onrender.com/auth/google/callback
FRONTEND_URL=https://your-frontend.vercel.app
GEMINI_API_KEY=your_gemini_api_key
```

## 🔐 Google Cloud Setup

Enable:
- Gmail API
- OAuth Consent Screen

Scopes required:
```
openid
email
profile
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.modify
```

### Authorized Redirect URIs
```
https://your-backend.onrender.com/auth/google/callback
```

### Authorized JavaScript Origins
```
https://your-frontend.vercel.app
```

## 🧠 API Endpoints

### Authentication
```
GET /auth/google/login
GET /auth/google/callback
GET /auth/me
```

### Emails
```
GET /emails/last5
POST /emails/reply
POST /emails/delete
```

## 🛠 Running Locally

### Backend
```
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```
npm install
npm run dev
```

## 🌐 Deployment

### Backend (Render)
Start command:
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Frontend (Vercel)
- Add `NEXT_PUBLIC_BACKEND_URL`
- Redeploy after updating `.env.local`

## 📌 Notes
- Sessions stored in memory
- Gemini used for summary + reply
- Reply target parsed using `email.utils.parseaddr`

## 🎉 Conclusion
This project integrates OAuth, Gmail API, AI generation, and full-stack deployment into a cohesive assistant system.
