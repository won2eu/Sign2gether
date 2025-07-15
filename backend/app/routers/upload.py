from fastapi import APIRouter, UploadFile, File,Form, HTTPException, Depends, Body, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os
import uuid
import base64
from datetime import datetime
from typing import Optional
from app.dependencies.database import get_db
from app.models import Document, Sign, DocumentSigner
from app.routers.auth import get_current_user_from_cookie
import json
from dotenv import load_dotenv
from email.mime.multipart import MIMEMultipart
import smtplib
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
import re

def is_valid_email(email: str) -> bool:
    # 간단한 이메일 정규식 (RFC 완벽 대응은 아님, 실무에서 충분)
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return re.match(pattern, email) is not None

router = APIRouter(prefix="/upload", tags=["upload"])

# 업로드 디렉토리 설정
UPLOAD_DIR = "resources"
DOC_DIR = os.path.join(UPLOAD_DIR, "docs")
SIGN_DIR = os.path.join(UPLOAD_DIR, "signs")

load_dotenv()
gmail_user = str(os.getenv("GMAIL_USER"))
gmail_password = str(os.getenv("GMAIL_PASSWORD"))

# 디렉토리가 없으면 생성
os.makedirs(DOC_DIR, exist_ok=True)
os.makedirs(SIGN_DIR, exist_ok=True)

def send_email_to_signers(emails, names, filename, url):
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(gmail_user, gmail_password)
    for email, name in zip(emails, names):
        body = f"안녕하세요, {name}님.<br>문서명: {filename}<br>서명을 요청합니다.<br><a href='{url}'>서명하러 가기</a>"
        msg = MIMEMultipart('related')
        msg['From'] = str(gmail_user)
        msg['To'] = email
        msg['Subject'] = f"sign2gether에서 함께 서명하세요. 문서명: {filename}"
        #msg_html = MIMEText(f'<html><body><img src="cid:image1"><br>{body}</body></html>', 'html')
        msg_html = MIMEText(f'''
        <html>
        <body style="background:#f9fafb; margin:0; padding:0;">            
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;">
            <tr>
                <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff; border-radius:12px; box-shadow:0 2px 8px #eee; padding:0 0 32px 0;">
                    <tr>
                    <td align="center" style="padding-top:0px; padding-bottom:24px;">
                        <img src="cid:image1" 
                            style="width:100%; max-width:600px; display:block; margin:0" 
                            alt="Sign2gether" />
                    </td>
                    </tr>
                    <tr>
                    <td align="center" style="font-size:15px; color:#444; font-weight:700; padding-bottom:24px;">
                        Sign2gether 서명 요청
                    </td>
                    </tr>
                    <tr>
                    <td style="font-size:12px; color:#444; font-weight:600; padding:0 32px 0 32px;">
                        안녕하세요, <b>{name}님</b>.
                    </td>
                    </tr>
                    <tr>
                    <td style="font-size:12px; color:#444; font-weight:600; padding:16px 32px 0 32px;">
                        문서명: <span style="font-weight:bold;">{filename}</span>
                    </td>
                    </tr>
                    <tr>
                    <td style="font-size:12px; color:#444; padding:16px 32px 0 32px;">
                        아래 버튼을 눌러 서명에 참여해 주세요!
                    </td>
                    </tr>
                    <tr>
                    <td align="center" style="padding:40px 0 0 0;">
                        <a href="{url}" style="background:#2979ff; color:#fff; text-decoration:none; padding:18px 48px; border-radius:8px; font-size:12px; font-weight:bold; display:inline-block;">
                        서명하러 가기
                        </a>
                    </td>
                    </tr>
                    <tr>
                    <td align="center" style="font-size:8px; color:#bbb; padding-top:20px;">
                        본 메일은 Sign2gether에서 자동 발송되었습니다.
                    </td>
                    </tr>
                </table>
                </td>
            </tr>
            </table>
        </body>
        </html>
        ''', 'html')
        msg.attach(msg_html)

        # 이미지 파일 읽기 및 추가
        with open("app/email_header.png", 'rb') as img:
            msg_image = MIMEImage(img.read(), name="email_header.png")
        msg_image.add_header('Content-ID', '<image1>')
        msg.attach(msg_image)
        #msg.attach(MIMEText(f"안녕하세요, {name}님.\n\n서명을 요청합니다.\n\n감사합니다.\n\n{url}", 'plain'))
        server.send_message(msg)
    server.quit()

@router.post("/docs/pdf",responses={
    200:{
        "description":"PDF 파일 업로드 성공",
        "content":{
            "application/json":{
                "example":{
  "message": "PDF 업로드 성공",
  "file": {
    "doc_filename": "b58737ca-166b-4a67-b5ad-5c8e90dee3fb.pdf",
    "original_name": "[별지 12] 개인정보 수집&middot%3B이용&middot%3B제공 동의서(개인투자조합 등록 및 투자확인….pdf",
    "size": 52206,
    "uploaded_at": "2025-07-13T11:12:36.974404",
    "file_url": "/resources/docs/b58737ca-166b-4a67-b5ad-5c8e90dee3fb.pdf"
  }
}}
        }
    },
    400:{
        "description":"PDF 파일 업로드 실패",
        "content":{
            "application/json":{
                "example":{
                    "detail":"PDF 파일만 업로드 가능합니다."
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
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    signers: Optional[str] = Form(None,description="JSON 형식의 구성원 정보",examples=['[{"name":"홍길동","email":"hong@example.com","role":"대표"},{"name":"김철수","email":"kim@example.com","role":"부장"}]']),
    current_user: dict = Depends(get_current_user_from_cookie),
    db: AsyncSession = Depends(get_db)  # dependency injection 추가
):
    """PDF 파일 업로드(로그인사용자만 가능)"""
    
    # 파일 타입 검증
    if not file.content_type == "application/pdf":
        raise HTTPException(
            status_code=400, 
            detail="PDF 파일만 업로드 가능합니다."
        )
    
    # 파일 크기 검증 (50MB 제한)
    if file.size and file.size > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="파일 크기는 50MB를 초과할 수 없습니다."
        )
    
    try:
        # 고유한 파일명 생성
        file_extension = os.path.splitext(file.filename or "")[1]
        stored_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(DOC_DIR, stored_filename)
        
        # 파일 저장
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # 파일 URL 생성
        file_url = f"/resources/docs/{stored_filename}"
        
        # 데이터베이스에 문서 정보 저장
        document = Document(
            uploader_id=current_user["id"],
            original_filename=file.filename,
            stored_filename=stored_filename,
            file_path=file_path,
            file_url=file_url,
            file_size=len(content),
            mime_type=file.content_type,
            uploaded_at=datetime.utcnow()
        )
        db.add(document)
        await db.commit()
        await db.refresh(document)
        if signers:
            signers_data = json.loads(signers)
            for signer in signers_data:
                document_signer = DocumentSigner(
                    document_id=document.id,
                    name=signer["name"],
                    email=signer["email"],
                    role=signer["role"],
                    is_signed=False
                )
                db.add(document_signer)
            names=[]
            emails=[]
            for signer in signers_data:
                if signer["email"] and is_valid_email(signer["email"]):
                    names.append(signer["name"])
                    emails.append(signer["email"])
            # 이메일 전송을 백그라운드로 등록
            if names and emails:
                background_tasks.add_task(send_email_to_signers, emails, names, file.filename, "https://sign2gether.vercel.app/"+stored_filename)
            await db.commit()
            await db.refresh(document_signer)   
        
        
        # 응답 데이터
        file_info = {
            "doc_filename": stored_filename,
            "original_name": file.filename,
            "size": len(content),
            "uploaded_at": document.uploaded_at.isoformat(),
            "file_url": file_url
        }
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "PDF 업로드 성공",
                "file": file_info
            }
        )
        
    except Exception as e:
        # 파일이 저장된 경우 삭제
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        
        raise HTTPException(
            status_code=500,
            detail=f"파일 업로드 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/sign/draw",responses={
    200:{
        "description":"서명 업로드 성공",
        "content":{
            "application/json":{
                "example":{
                    "message": "서명 업로드 성공",
                    "sign": {
                        "sign_filename": "b58737ca-166b-4a67-b5ad-5c8e90dee3fb.png",
                        "file_url": "/resources/signs/b58737ca-166b-4a67-b5ad-5c8e90dee3fb.png",
                        "uploaded_at": "2025-07-13T11:12:36.974404",
                        "user_id": 1
                    }
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
async def upload_sign_draw(
    sign_data: dict = Body(...,description="base64 PNG 이미지 데이터",examples=['{"image":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBApU6ZQAAAABJRU5ErkJggg=="}']),  # base64 PNG 이미지 데이터
    current_user: dict = Depends(get_current_user_from_cookie),
    db: AsyncSession = Depends(get_db)
):
    """서명 그리기 데이터 업로드 (base64 PNG)(로그인 사용자만 가능)"""
    
    try:
        # base64 이미지 데이터 추출
        image_data = sign_data.get("image")
        if not image_data:
            raise HTTPException(
                status_code=400,
                detail="이미지 데이터가 필요합니다."
            )
        
        # base64 디코딩
        try:
            # "data:image/png;base64," 부분 제거
            if "data:image/png;base64," in image_data:
                image_data = image_data.split(",")[1]
            
            image_bytes = base64.b64decode(image_data)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="잘못된 base64 이미지 형식입니다."
            )
        
        # PNG 시그니처 검증 (선택사항)
        if not image_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
            raise HTTPException(
                status_code=400,
                detail="PNG 파일 형식이 아닙니다."
            )
        
        # 고유한 파일명 생성
        stored_filename = f"sign_{uuid.uuid4()}.png"
        file_path = os.path.join(SIGN_DIR, stored_filename)
        
        # 파일 저장
        with open(file_path, "wb") as buffer:
            buffer.write(image_bytes)
        
        # 파일 URL 생성
        file_url = f"/resources/signs/{stored_filename}"
        
        # 데이터베이스에 서명 정보 저장
        sign = Sign(
            user_id=current_user["id"],
            stored_filename=stored_filename,
            file_url=file_url,
            uploaded_at=datetime.utcnow()
        )
        
        db.add(sign)
        await db.commit()
        await db.refresh(sign)
        
        # 응답 데이터
        sign_info = {
            "sign_filename": stored_filename,
            "file_url": file_url,
            "uploaded_at": sign.uploaded_at.isoformat(),
            "user_id": sign.user_id
        }
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "서명 업로드 성공",
                "sign": sign_info
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # 파일이 저장된 경우 삭제
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        
        raise HTTPException(
            status_code=500,
            detail=f"서명 업로드 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/sign/draw/guest",responses={
    200:{
        "description":"서명 업로드 성공",
        "content":{
            "application/json":{
                "example":{
  "message": "게스트 서명 업로드 성공",
  "sign": {
    "sign_filename": "sign_guest_65f7efdf-1a27-475d-80c1-cd6161c44174.png",
    "file_url": "/resources/signs/sign_guest_65f7efdf-1a27-475d-80c1-cd6161c44174.png",
    "uploaded_at": "2025-07-13T11:33:43.965629",
    "is_guest": True
  }
}
            }
        }
    }})
async def upload_sign_draw_guest(
    sign_data: dict= Body(...,description="base64 PNG 이미지 데이터",examples=['{"image":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBApU6ZQAAAABJRU5ErkJggg=="}']),  # base64 PNG 이미지 데이터
    db: AsyncSession = Depends(get_db)
):
    """비로그인 사용자 서명 그리기 데이터 업로드 (base64 PNG)"""
    
    try:
        # base64 이미지 데이터 추출
        image_data = sign_data.get("image")
        if not image_data:
            raise HTTPException(
                status_code=400,
                detail="이미지 데이터가 필요합니다."
            )
        
        # base64 디코딩
        try:
            # "data:image/png;base64," 부분 제거
            if "data:image/png;base64," in image_data:
                image_data = image_data.split(",")[1]
            
            image_bytes = base64.b64decode(image_data)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="잘못된 base64 이미지 형식입니다."
            )
        
        # PNG 시그니처 검증 (선택사항)
        if not image_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
            raise HTTPException(
                status_code=400,
                detail="PNG 파일 형식이 아닙니다."
            )
        
        # 고유한 파일명 생성
        stored_filename = f"sign_guest_{uuid.uuid4()}.png"
        file_path = os.path.join(SIGN_DIR, stored_filename)
        
        # 파일 저장
        with open(file_path, "wb") as buffer:
            buffer.write(image_bytes)
        
        # 파일 URL 생성
        file_url = f"/resources/signs/{stored_filename}"
        
        # 데이터베이스에 서명 정보 저장 (user_id는 null)
        sign = Sign(
            user_id=None,  # 비로그인 사용자는 user_id가 null
            stored_filename=stored_filename,
            file_url=file_url,
            uploaded_at=datetime.utcnow()
        )
        
        db.add(sign)
        await db.commit()
        await db.refresh(sign)
        
        # 응답 데이터
        sign_info = {
            "sign_filename": stored_filename,
            "file_url": file_url,
            "uploaded_at": sign.uploaded_at.isoformat(),
            "is_guest": True  # 게스트 사용자임을 표시
        }
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "게스트 서명 업로드 성공",
                "sign": sign_info
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # 파일이 저장된 경우 삭제
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        
        raise HTTPException(
            status_code=500,
            detail=f"서명 업로드 중 오류가 발생했습니다: {str(e)}"
        )