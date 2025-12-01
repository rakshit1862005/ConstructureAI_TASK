import os
import uuid
import httpx
import uvicorn  
from fastapi import FastAPI, Request, Response, Depends, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")  
FRONTEND_URL = os.getenv("FRONTEND_URL")                

# store sessions in memory
SESSIONS = {}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# GOOGLE LOGIN 
GOOGLE_AUTH_URL = (
    "https://accounts.google.com/o/oauth2/v2/auth"
)
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify"
]

@app.get("/auth/google/login")
def google_login():
    scope_str = " ".join(SCOPES)

    redirect_url = (
        f"{GOOGLE_AUTH_URL}"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&access_type=offline"
        f"&prompt=consent"
        f"&scope={scope_str}"
    )

    return RedirectResponse(url=redirect_url)


@app.get("/auth/google/callback")
async def google_callback(code: str, response: Response):

    # Exchange code -> tokens
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }

    async with httpx.AsyncClient() as client:
        token_res = await client.post(GOOGLE_TOKEN_URL, data=data)
    
    if token_res.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to exchange code")

    token_json = token_res.json()
    access_token = token_json.get("access_token")
    refresh_token = token_json.get("refresh_token")

    # Fetch user info (name, email)
    async with httpx.AsyncClient() as client:
        userinfo_res = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )

    if userinfo_res.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch user info")

    userinfo = userinfo_res.json()

    email = userinfo.get("email")
    name = userinfo.get("name")

    # create session
    session_id = str(uuid.uuid4())
    SESSIONS[session_id] = {
        "email": email,
        "name": name,
        "access_token": access_token,
        "refresh_token": refresh_token
    }

    # Set session cookie
    response = RedirectResponse(url=f"{FRONTEND_URL}/dashboard")
    response.set_cookie(key="session_id", value=session_id, httponly=True, samesite="Lax")

    return response


# SESSION CHECKING
def get_current_session(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id or session_id not in SESSIONS:
        raise HTTPException(status_code=401, detail="Not logged in / session expired")
    return SESSIONS[session_id]


@app.get("/auth/me")
def auth_me(session=Depends(get_current_session)):
    return {
        "email": session["email"],
        "name": session["name"]
    }


# LOGOUT FROM CLIENT
@app.post("/auth/logout")
def logout(response: Response, request: Request):
    session_id = request.cookies.get("session_id")
    if session_id in SESSIONS:
        del SESSIONS[session_id]

    response = JSONResponse({"status": "logged out"})
    response.delete_cookie("session_id")
    return response

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)