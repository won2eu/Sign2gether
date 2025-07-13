from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os
import uuid
import base64
from datetime import datetime

from app.dependencies.database import get_db
from app.models import Document, Sign
from app.routers.auth import get_current_user_from_cookie

router = APIRouter(prefix="/upload", tags=["upload"])

# 업로드 디렉토리 설정
UPLOAD_DIR = "resources"
DOC_DIR = os.path.join(UPLOAD_DIR, "docs")
SIGN_DIR = os.path.join(UPLOAD_DIR, "signs")


# 디렉토리가 없으면 생성
os.makedirs(DOC_DIR, exist_ok=True)
os.makedirs(SIGN_DIR, exist_ok=True)

@router.post("/docs/pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_from_cookie),
    db: AsyncSession = Depends(get_db)  # dependency injection 추가
):
    """PDF 파일 업로드"""
    
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
        
        # 응답 데이터
        file_info = {
            "id": document.id,
            "filename": stored_filename,
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


@router.post("/sign/draw")
async def upload_sign_draw(
    sign_data: dict,  # base64 PNG 이미지 데이터
    current_user: dict = Depends(get_current_user_from_cookie),
    db: AsyncSession = Depends(get_db)
):
    """서명 그리기 데이터 업로드 (base64 PNG)"""
    
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
            "id": sign.id,
            "filename": stored_filename,
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


@router.post("/sign/draw/guest")
async def upload_sign_draw_guest(
    sign_data: dict,  # base64 PNG 이미지 데이터
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
            "id": sign.id,
            "filename": stored_filename,
            "file_url": file_url,
            "uploaded_at": sign.uploaded_at.isoformat(),
            "user_id": sign.user_id,  # null이 반환됨
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