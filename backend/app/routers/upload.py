from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
import os
from datetime import datetime
from app.routers.auth import get_current_user_from_cookie
import uuid

router = APIRouter(prefix="/upload", tags=["upload"])

# 업로드 디렉토리 설정
UPLOAD_DIR = "resources"
PDF_DIR = os.path.join(UPLOAD_DIR, "pdfs")

# 디렉토리가 없으면 생성
os.makedirs(PDF_DIR, exist_ok=True)

@router.post("/docs/pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user_from_cookie)
):
    """PDF 파일 업로드"""
    
    # 파일 타입 검증
    if not file.content_type == "application/pdf":
        raise HTTPException(
            status_code=400, 
            detail="PDF 파일만 업로드 가능합니다."
        )
    
    # 파일 크기 검증 (10MB 제한)
    if file.size and file.size > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="파일 크기는 50MB를 초과할 수 없습니다."
        )
    
    try:
        # 파일명 생성 (timestamp + 원본 파일명)
        filename = f"{uuid.uuid4()}.pdf"
        file_path = os.path.join(PDF_DIR, filename)
        
        # 파일 저장
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        
        # 응답 데이터
        file_info = {
            "filename": filename,
            "original_name": file.filename,
            "size": len(content),
            "uploaded_at": datetime.now().isoformat(),
            "user_id": current_user["id"],
            "file_path": file_path
        }
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "PDF 업로드 성공",
                "file": file_info
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"파일 업로드 중 오류가 발생했습니다: {str(e)}"
        )
