

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
import  os
from dotenv import load_dotenv


import requests

app = FastAPI()
load_dotenv()
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

REDIRECT_URI = "http://localhost:8000/auth/google/callback"

# 1. 로그인 시작
@app.get("/auth/google/login")
def login_with_google():
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        "?response_type=code"
        f"&client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}"
        "&scope=openid%20email%20profile"
    )
    return RedirectResponse(url=google_auth_url)

# 2. 콜백 처리
@app.get("/auth/google/callback")
def google_auth_callback(  code: str):
    # 3. 액세스 토큰 요청
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    token_response = requests.post(token_url, data=data).json()
    access_token = token_response.get("access_token")

    # 4. 사용자 정보 요청
    user_info = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    ).json()

    # 5. 사용자 정보 처리 (예: DB저장 or JWT발급)
    print(user_info)
    # return RedirectResponse(f"http://localhost:3000/dashboard?email={user_info['email']}")
    return user_info  # or JWT 발급 후 리디렉션
