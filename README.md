# AI Email Assistant – Full-Stack Application

## 📌 Overview  
This project is a fully functional **AI-powered email assistant** built using **FastAPI** (backend), **Next.js** (frontend), **Gemini AI**, **Google OAuth**, and the **Gmail API**.  
It allows authenticated users to:

- Log in using Google  
- Read their last 5 Gmail emails  
- View AI-generated summaries using Gemini  
- Generate contextual replies using AI  
- Send the reply to the original sender  
- Delete emails from their inbox  
- Use a chat-style interface to control everything  

**Live URL:**  
https://constructure-ai-task.vercel.app/

---

## 🧠 Brief Description of the Solution  
The application combines Google OAuth authentication, Gmail API access, and Gemini-powered AI to automate email workflows. Users interact through a chat interface where natural language commands like *"read emails"*, *"reply 1"*, and *"delete 3"* trigger API calls.  
AI handles summarization and reply generation, while FastAPI serves secure backend routes to communicate with Google services.

---

## ⚙️ Setup Instructions

### 1. 🔧 Backend (FastAPI)

#### **Install dependencies**
```bash
pip install -r requirements.txt
```

#### **Run locally**
```bash
uvicorn main:app --reload
```

#### **Deploy (Render)**
- Create a **Web Service**
- Set the start command:
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```
- Add environment variables from the list below

---

### 2. 🎨 Frontend (Next.js)

#### **Install packages**
```bash
npm install
```

#### **Run locally**
```bash
npm run dev
```

#### **Deploy (Vercel)**
- Create a new Vercel project
- Add environment variables
- Deploy with automatic build

---

## 🔐 Configuring Google Credentials & OAuth

### Step 1 — Create a Google Cloud Project  
Visit: https://console.cloud.google.com

### Step 2 — Enable APIs  
Enable:
- **Gmail API**
- **Google People API** (optional)
- **OAuth Consent Screen** → External

### Step 3 — Create OAuth Client ID  
Choose **Web Application**  
Add:

#### Authorized JavaScript origins:
```
https://your-frontend.vercel.app
```

#### Authorized Redirect URIs:
```
https://your-backend.onrender.com/auth/google/callback
```

### Step 4 — Copy credentials  
Store:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

---

## 🔑 Environment Variables

### Backend (.env)
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-backend.onrender.com/auth/google/callback
FRONTEND_URL=https://your-frontend.vercel.app
GEMINI_API_KEY=your_gemini_api_key
```

### Frontend (.env.local)
```
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
```

---

## 🧩 Technologies Used

### **Frontend**
- Next.js 14 (App Router)
- React
- TailwindCSS
- Fetch API with cookies

### **Backend**
- FastAPI
- httpx (async Gmail API requests)
- Google OAuth 2.0
- Gmail API
- python-dotenv
- Uvicorn (Render runtime)

### **AI Provider**
- **Google Gemini 2.5 Flash** for:
  - Email summarization
  - Reply generation

---

## ⚠️ Assumptions / Known Limitations

- Sessions are stored **in memory** (not suitable for production).
- Gmail API rate limits may apply.
- Some HTML-heavy emails may produce imperfect summaries.
- Reply accuracy depends on Gemini model output.
- The application requires **third-party cookies enabled** for Google OAuth redirection.
- Render free tier may cause a cold start delay.

---

## 🎉 Conclusion  
This project demonstrates seamless integration between OAuth authentication, Gmail API handling, AI-powered text generation, and full-stack deployment.  
It automates everyday email workflows while keeping the interface simple and conversational.

