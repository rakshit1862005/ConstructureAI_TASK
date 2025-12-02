import os
import uuid
import base64
import httpx
from email.mime.text import MIMEText
from email.utils import parseaddr
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response, Depends, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import uvicorn

# ---------------- ENV ----------------
load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not set in environment")

genai.configure(api_key=GEMINI_API_KEY)

# ---------------- SESSION STORE ----------------
SESSIONS = {}

# ---------------- APP ----------------
app = FastAPI()

# IMPORTANT: for cookies with credentials, don't use "*"
allowed_origins = []
if FRONTEND_URL:
    # FRONTEND_URL like "http://localhost:3000" or "https://your-app.vercel.app"
    # if you accidentally included a path, browser will still send Origin without path
    allowed_origins = [FRONTEND_URL]
else:
    allowed_origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- CONSTANTS ----------------
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
]

# ---------------- HELPERS ----------------
def decode_body(body):
    data = body.get("data")
    if not data:
        return ""
    # Gmail uses URL-safe base64
    return base64.urlsafe_b64decode(data.encode("utf-8")).decode(
        "utf-8", errors="ignore"
    )


def extract_headers(payload):
    # First check root headers
    if "headers" in payload:
        hdr_dict = {h["name"]: h["value"] for h in payload["headers"]}
        if "From" in hdr_dict:
            return hdr_dict

    # Then check nested parts for headers
    for part in payload.get("parts", []):
        if "headers" in part:
            hdr_dict = {h["name"]: h["value"] for h in part["headers"]}
            if "From" in hdr_dict:
                return hdr_dict

    # Fallback root
    return {h["name"]: h["value"] for h in payload.get("headers", [])}


def extract_email_body(msg_json):
    """
    Try hard to get a readable body.
    - Prefer text/plain
    - Fallback to text/html
    - Search recursively in parts (Gmail can nest multiparts)
    """
    payload = msg_json.get("payload", {})

    def find_text(part):
        if not part:
            return ""

        mime = part.get("mimeType", "")
        body = part.get("body", {})

        # Prefer plain text
        if mime == "text/plain" and body.get("data"):
            return decode_body(body)

        # Fallback to html
        if mime == "text/html" and body.get("data"):
            return decode_body(body)

        for sub in part.get("parts", []):
            text = find_text(sub)
            if text:
                return text

        return ""

    text = find_text(payload)
    return text or ""


def extract_email_address(header_value: str) -> str:
    """
    'Some Name <someone@example.com>' -> 'someone@example.com'
    """
    if not header_value:
        return ""
    name, addr = parseaddr(header_value)
    return addr or header_value


async def gemini_summarize(text: str) -> str:
    if not text.strip():
        return "No content in email body."
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        resp = model.generate_content(
            f"Summarize this email in 2 concise sentences:\n\n{text}"
        )
        return (resp.text or "").strip()
    except Exception as e:
        print("Gemini summarize error:", e)
        return "Summary unavailable."


async def gemini_reply_email(
    subject: str, body: str, sender: Optional[str] = None
) -> str:
    if not body.strip():
        body = "(The original email body was empty or not readable.)"
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = f"""
You are a polite, professional email assistant.

Write a clear, concise, professional reply to this email.
Keep it as a real email body (no headings like "Reply:" etc).

From: {sender or "Unknown sender"}
Subject: {subject}

Email body:
{body}

Now write ONLY the reply email body, nothing else:
"""
        resp = model.generate_content(prompt)
        return (resp.text or "").strip()
    except Exception as e:
        print("Gemini reply error:", e)
        return "AI reply unavailable."


# ---------------- AUTH ----------------
@app.get("/auth/google/login")
def google_login():
    scope_str = " ".join(SCOPES)
    redirect = (
        f"{GOOGLE_AUTH_URL}"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&access_type=offline"
        f"&prompt=consent"
        f"&scope={scope_str}"
    )
    return RedirectResponse(redirect)


@app.get("/auth/google/callback")
async def google_callback(code: str, response: Response):
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient() as client:
        token_res = await client.post(GOOGLE_TOKEN_URL, data=data)

    if token_res.status_code != 200:
        print("Token exchange error:", token_res.text)
        raise HTTPException(400, "Token exchange failed")

    token_json = token_res.json()
    access_token = token_json["access_token"]
    refresh_token = token_json.get("refresh_token")

    # Get user profile
    async with httpx.AsyncClient() as client:
        profile = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    info = profile.json()

    # Store session
    session_id = str(uuid.uuid4())
    SESSIONS[session_id] = {
        "email": info["email"],
        "name": info.get("name") or info["email"],
        "access_token": access_token,
        "refresh_token": refresh_token,
    }

    # Keep path same as your Next.js dashboard route
    resp = RedirectResponse(f"{FRONTEND_URL}/pages/dashboard")
    resp.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=True,
        samesite="None"
    )
    return resp



def get_session(request: Request):
    sid = request.cookies.get("session_id")
    if not sid or sid not in SESSIONS:
        raise HTTPException(401, "Session expired")
    return SESSIONS[sid]


@app.get("/auth/me")
def auth_me(session=Depends(get_session)):
    return {"email": session["email"], "name": session["name"]}


# ---------------- EMAIL ROUTES ----------------
@app.get("/emails/last5")
async def last_5(session=Depends(get_session)):
    access = session["access_token"]
    headers = {"Authorization": f"Bearer {access}"}

    async with httpx.AsyncClient() as client:
        msg_list = await client.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5",
            headers=headers,
        )

    if msg_list.status_code != 200:
        print("Gmail list error:", msg_list.text)
        raise HTTPException(status_code=msg_list.status_code, detail="Gmail list failed")

    messages = msg_list.json().get("messages", [])
    session["last_emails"] = []
    results = []

    async with httpx.AsyncClient() as client:
        for idx, msg in enumerate(messages, start=1):
            mid = msg["id"]

            full_msg = await client.get(
                f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{mid}",
                headers=headers,
            )

            if full_msg.status_code != 200:
                print("Gmail get message error:", full_msg.text)
                continue

            full = full_msg.json()
            hdrs = extract_headers(full["payload"])

            sender_header = hdrs.get("From", "Unknown")
            sender_email = extract_email_address(sender_header)
            subject = hdrs.get("Subject", "(No Subject)")

            body = extract_email_body(full)
            summary = await gemini_summarize(body)

            # What frontend sees
            results.append(
                {
                    "index": idx,
                    "id": mid,
                    "sender": sender_header,  # <-- your frontend uses email.sender
                    "subject": subject,
                    "summary": summary,
                }
            )

            # What we store for reply/delete actions
            session["last_emails"].append(
                {
                    "id": mid,
                    "from": sender_header,
                    "from_email": sender_email,  # parsed email only
                    "subject": subject,
                    "body": body,
                }
            )

    print("LAST5 RESULTS:", results)
    return results


@app.post("/emails/reply")
async def reply_email(data: dict, session=Depends(get_session)):
    idx = data.get("index")
    emails = session.get("last_emails", [])

    if not emails or idx is None or idx < 1 or idx > len(emails):
        raise HTTPException(400, "Invalid index")

    email_data = emails[idx - 1]

    # Generate reply using subject + body + sender
    reply_text = await gemini_reply_email(
        subject=email_data["subject"],
        body=email_data["body"],
        sender=email_data.get("from"),
    )

    msg = MIMEText(reply_text)
    # Send to parsed email address, fall back to header if parse fails
    msg["To"] = email_data.get("from_email") or email_data["from"]
    msg["From"] = session["email"]
    msg["Subject"] = "Re: " + email_data["subject"]

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

    headers = {
        "Authorization": f"Bearer {session['access_token']}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        send_res = await client.post(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            headers=headers,
            json={"raw": raw},
        )

    if send_res.status_code not in [200, 202]:
        print("Gmail send error:", send_res.text)
        return {"reply": "Failed to send email."}

    return {"reply": reply_text}


@app.post("/emails/delete")
async def delete_email(data: dict, session=Depends(get_session)):
    idx = data.get("index")
    emails = session.get("last_emails", [])

    if not emails or idx is None or idx < 1 or idx > len(emails):
        raise HTTPException(400, "INVALID INDEX")

    mid = emails[idx - 1]["id"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

    async with httpx.AsyncClient() as client:
        trash_res = await client.post(
            f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{mid}/trash",
            headers=headers
        )

    if trash_res.status_code not in [200]:
        print("Gmail TRASH error:", trash_res.text)
        return {"status": "Trash failed"}

    return {"status": f"Moved email {idx} to Trash"}

@app.get("/auth/logout")
def logout(response: Response):
    response = RedirectResponse(url=FRONTEND_URL)
    response.delete_cookie("session_id")
    return response






