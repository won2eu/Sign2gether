from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
import os
from dotenv import load_dotenv
import requests
from app.services.user import create_or_update_user, get_user_by_id
from app.dependencies.database import get_db
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse

load_dotenv()
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = "https://sign2gether-api-production.up.railway.app/auth/google/callback"

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

async def get_current_user_from_cookie(
    request: Request,
    db: AsyncSession = Depends(get_db)  # dependency injection 추가
):
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
    
    # DB에서 사용자 정보 조회 (dependency injection 사용)
    user = await get_user_by_id(db, int(user_id))
    
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

@router.get("/google/login",status_code=307,responses={
        307: {
            "description": "구글 로그인 페이지로 리다이렉트",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "구글 로그인 페이지로 리다이렉트됩니다.",
                        "location": "https://accounts.google.com/o/oauth2/v2/auth?res......"
                    }
                }
            }
        }
    })
def login_with_google():
    """구글 로그인 페이지로 리다이렉트"""
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        "?response_type=code"
        f"&client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}"
        "&scope=openid%20email%20profile"
    )
    return RedirectResponse(url=google_auth_url)

@router.get("/google/callback",status_code=307,responses={
        307: {
            "description": "루트 페이지로 리다이렉트",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "루트 페이지로 리다이렉트됩니다.",
                        "location": "localhost:3000/"
                    }
                }
            }
        }
    })
async def google_auth_callback(
    code: str,
    db: AsyncSession = Depends(get_db)  # dependency injection 추가
):
    """구글 로그인 콜백"""
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

    # DB에 사용자 정보 저장 (dependency injection 사용)
    user = await create_or_update_user(db, user_info)

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
        secure=True,   # 개발환경에서는 False, 프로덕션에서는 True
        samesite="none",
        max_age=1800
    )
    return response

@router.get("/me",responses={
        200: {
            "description": "현재 로그인한 사용자 정보 예시",
            "content": {
                "application/json": {
                    "example": {
                        "email": "hong@example.com",
                        "name": "홍길동",
                        "picture": "https://lh3.googleusercontent.com/a/ACg8ocIBgE3IjPjwW99_gZW1Lk1AV26ZgcmtK1slIP-G_p1O2SKRVw=s96-c",
                        "created_at": "2024-07-13T12:34:56.789Z"
                    }
                }
            }
        },
        401: {
            "description": "인증되지 않은 사용자",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Not authenticated"
                    }
                }
            }
        }
    })
async def get_current_user_info(
    current_user = Depends(get_current_user_from_cookie)
):
    """현재 로그인한 사용자 정보 조회 (쿠키 기반 JWT)"""
    
    return {
        "email": current_user["email"],
        "name": current_user["name"],
        "picture": current_user["picture"],
        "created_at": current_user["created_at"]
    }


# 여기서 리다이렉트 resp는 무조건 307을 반환해서 200을 반환하는 Json Resp로 바꿨습니다!
@router.get("/logout",responses={
        200: {
            "description": "루트 페이지로 리다이렉트",
            "content": {
                "application/json": {
                    "example": {
                        "message": "logout success"
                    }
                }
            }
        }
    })
async def logout():
    """로그아웃 - 쿠키 삭제"""
    response = JSONResponse(content={"message": "logout success"})
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=True,
        samesite="none"
    )
    return response