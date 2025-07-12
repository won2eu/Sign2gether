from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
import os
from dotenv import load_dotenv
import requests
from app.services.user import create_or_update_user, get_user_by_id
from jose import JWTError, jwt
from datetime import datetime,timedelta
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials


load_dotenv()
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = "http://localhost:8000/auth/google/callback"

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()

def verify_token(token: str):
    try:
        if not SECRET_KEY:
            return None
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None



async def get_current_user_from_cookie(request: Request):
    """쿠키에서 JWT 토큰을 읽어 DB에서 사용자 정보를 반환하는 함수"""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # JWT에서 user_id 추출
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # DB에서 사용자 정보 조회
    user = await get_user_by_id(int(user_id))
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }



def create_access_token(data: dict, expires_delta: timedelta | None = None):
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY is not set")
    
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/google/login")
def login_with_google():
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        "?response_type=code"
        f"&client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}"
        "&scope=openid%20email%20profile"
    )
    return RedirectResponse(url=google_auth_url)

@router.get("/google/callback")
async def google_auth_callback(code: str):
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

    user_info = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    ).json()

    # DB에 사용자 정보 저장
    user = await create_or_update_user(user_info)

    # JWT 토큰 생성
    access_token_expires = timedelta(minutes=30)
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "name": user.name
    }
    jwt_token = create_access_token(
        data=token_data, 
        expires_delta=access_token_expires
    )

    # JWT 토큰을 쿠키로 전달 (더 안전함)
    response = RedirectResponse(url="http://localhost:3000/")
    response.set_cookie(
        key="access_token",
        value=jwt_token,
        httponly=True,  # JavaScript에서 접근 불가
        secure=False,   # 개발환경에서는 False, 프로덕션에서는 True
        samesite="lax",
        max_age=1800,    # 30분
        domain="localhost"
    )
    return response

@router.get("/me")
async def get_current_user_info(current_user = Depends(get_current_user_from_cookie)):
    """현재 로그인한 사용자 정보 조회 (쿠키 기반 JWT)"""
    
    return {
        "email": current_user["email"],
        "name": current_user["name"],
        "picture": current_user["picture"],
        "created_at": current_user["created_at"]
    }

@router.get("/logout")
async def logout():
    """로그아웃 - 쿠키 삭제"""
    response = RedirectResponse(url="http://localhost:3000/")
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=False,
        samesite="lax"
    )
    return response