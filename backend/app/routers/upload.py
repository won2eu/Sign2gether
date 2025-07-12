from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os
import uuid
from datetime import datetime

from app.dependencies.database import get_db
from app.models import Document
from app.routers.auth import get_current_user_from_cookie

router = APIRouter(prefix="/upload", tags=["upload"])

# 업로드 디렉토리 설정
UPLOAD_DIR = "resources"
PDF_DIR = os.path.join(UPLOAD_DIR, "pdfs")

# 디렉토리가 없으면 생성
os.makedirs(PDF_DIR, exist_ok=True)

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
        file_extension = os.path.splitext(file.filename)[1]
        stored_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(PDF_DIR, stored_filename)
        
        # 파일 저장
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # 파일 URL 생성
        file_url = f"/resources/pdfs/{stored_filename}"
        
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
        
        
