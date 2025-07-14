from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os
from pydantic import BaseModel
from typing import List
from app.dependencies.database import get_db
from app.models import Document, Sign, DocumentSigner
from app.routers.auth import get_current_user_from_cookie
import base64
import io
from PyPDF2 import PdfWriter,PdfReader as RLReader
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader


router = APIRouter(prefix="/documents", tags=["documents"])

class SignerStatusUpdate(BaseModel):
    is_signed: bool
    
class SignInfo(BaseModel):
       base64: str
       x: float
       y: float
       width: float
       height: float
       num_page: int

@router.get("/",responses={
        200: {
            "description": "현재 로그인한 사용자가 업로드한 파일들 목록 예시",
            "content": {
                "application/json": {
                    "example": [
  {
    "original_filename": "[별지 12] 개인정보 수집&middot%3B이용&middot%3B제공 동의서(개인투자조합 등록 및 투자확인….pdf",
    "doc_filename": "9140fff4-b53c-4e10-aa12-914abb4e818e.pdf",
    "file_url": "/resources/docs/9140fff4-b53c-4e10-aa12-914abb4e818e.pdf",
    "uploaded_at": "2025-07-13T06:30:36.440971",
    "file_size": 52206,
    "mime_type": "application/pdf"
  },
  {
    "original_filename": "[별지 12] 개인정보 수집&middot%3B이용&middot%3B제공 동의서(개인투자조합 등록 및 투자확인….pdf",
    "doc_filename": "85479f10-e2c4-4f9c-82a8-0839841cdf57.pdf",
    "file_url": "/resources/docs/85479f10-e2c4-4f9c-82a8-0839841cdf57.pdf",
    "uploaded_at": "2025-07-13T08:05:51.085329",
    "file_size": 52206,
    "mime_type": "application/pdf"
  }]
                }
            }
        }})
async def get_my_documents(
    current_user: dict = Depends(get_current_user_from_cookie),
    db: AsyncSession = Depends(get_db)
):
    """
    로그인한 사용자가 업로드한 문서 목록 반환
    """
    result = await db.execute(
        select(Document).where(Document.uploader_id == current_user["id"])
    )
    documents = result.scalars().all()
    # 원하는 필드만 추려서 반환
    return [
        {
            "original_filename": doc.original_filename,
            "doc_filename": doc.stored_filename,
            "file_url": doc.file_url,
            "uploaded_at": doc.uploaded_at,
            "file_size": doc.file_size,
            "mime_type": doc.mime_type,
        }
        for doc in documents
    ]
@router.get("/{doc_filename}",responses={
    200:{
        "description":"문서 조회 성공",
        "content":{
            "application/json":{
                "example":{
                    "message": "문서 조회 성공",
                    "doc_filename": "9140fff4-b53c-4e10-aa12-914abb4e818e.pdf",
                    "original_filename": "[별지 12] 개인정보 수집&middot%3B이용&middot%3B제공 동의서(개인투자조합 등록 및 투자확인….pdf",
                    "file_url": "/resources/docs/9140fff4-b53c-4e10-aa12-914abb4e818e.pdf",
                    "uploaded_at": "2025-07-13T06:30:36.440971",
                    "file_size": 52206,
                    "mime_type": "application/pdf"
                }
            }
        }
    }})
async def get_document(
    doc_filename: str,
    db: AsyncSession = Depends(get_db)
):
    """
    문서 조회
    """
    result = await db.execute(
        select(Document).where(Document.stored_filename == doc_filename)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    return {
        "message": "문서 조회 성공",
        "doc_filename": document.stored_filename,
        "original_filename": document.original_filename,
        "file_url": document.file_url,
        "uploaded_at": document.uploaded_at,
        "file_size": document.file_size,
        "mime_type": document.mime_type
    }

@router.delete("/{doc_filename}",responses={
    200:{
        "description":"문서 삭제 성공",
        "content":{
            "application/json":{
                "example":{
                    "message": "문서 삭제 성공",
                    "deleted_filename": "85479f10-e2c4-4f9c-82a8-0839841cdf57.pdf"
                }
            }
        }
    }})
async def delete_document(
    doc_filename: str,
    current_user: dict = Depends(get_current_user_from_cookie),
    db: AsyncSession = Depends(get_db)
):
    """
    로그인 된 사용자가 자신 소유의 파일의 파일명(저장된 이름)으로 문서 삭제
    """
    result = await db.execute(
        select(Document).where(Document.stored_filename == doc_filename)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    # 권한 확인 (본인이 업로드한 문서만 삭제 가능)
    if document.uploader_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="본인이 업로드한 문서만 삭제할 수 있습니다.")

    # 파일 삭제
    file_path = document.file_path
    if os.path.exists(file_path):
        os.remove(file_path)

    # DB에서 삭제
    await db.delete(document)
    await db.commit()

    return {"message": "문서 삭제 성공", "deleted_filename": doc_filename}



@router.post("/{doc_filename}/sign/{signer_id}",responses={
    200:{
        "description":"서명 삽입 성공",
        "content":{
            "application/json":{
                "example":{
                    "message": "문서에 서명 삽입 성공"
                }
            }
        }
    }})
async def insert_sign_to_document(
    doc_filename: str,
    signer_id: int,
    signs: List[SignInfo] = Body(...,description="서명 삽입 정보"),
    db: AsyncSession = Depends(get_db)
):
    """
    문서에 서명 삽입 (doc_filename, signer_id, [base 64 ,위치값과 비율, 페이지번호] 필요)
    """
    result = await db.execute(
        select(Document).where(Document.stored_filename == doc_filename)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    # 2. signer 찾기 (해당 문서에 속한 signer만)
    result = await db.execute(
        select(DocumentSigner).where(
            DocumentSigner.id == signer_id,
            DocumentSigner.document_id == document.id
        )
    )
    signer = result.scalar_one_or_none()
    if not signer:
        raise HTTPException(status_code=404, detail="해당 signer를 찾을 수 없습니다.")

    # 3. is_signed 값 변경
    if signer.is_signed == False:
        signer.is_signed = True;
    else:
        raise HTTPException(status_code=400, detail="이미 서명된 문서입니다.")
    
    await db.commit()
    await db.refresh(signer)

    reader = RLReader("resources/docs/" + doc_filename)
    writer = PdfWriter()
    for page_num in range(len(reader.pages)):
        page = reader.pages[page_num]
        page_signs = [s for s in signs if s.num_page == page_num + 1]
        if not page_signs:
            writer.add_page(page)
            continue

        packet = io.BytesIO()
        # PDF 페이지 크기 가져오기 (points 단위)
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        can = canvas.Canvas(packet, pagesize=(width, height))

        for sign in page_signs:
            # base64 → PIL 이미지 변환
            img_data = base64.b64decode(sign.base64.split(',')[-1])
            img = Image.open(io.BytesIO(img_data))

            # 좌표/크기 변환 (PDF 좌표계: 좌하단 0,0)
            # sign['x'], sign['y'], sign['width'], sign['height']는 PDF 좌표계 기준이어야 함
            # 만약 퍼센트(0~100)라면 변환 필요
            pdf_w = float(page.mediabox.width)
            pdf_h = float(page.mediabox.height)

            x = sign.x * pdf_w/100   
            w = sign.width * pdf_w/100
            h = sign.height * pdf_h/100
            y = pdf_h - sign.y * pdf_h/100 - h

            # reportlab은 좌하단 기준, y좌표 변환 필요
            can.drawImage(ImageReader(img), x, y, w, h, mask='auto')

        can.save()
        packet.seek(0)

        # 임시 PDF를 PyPDF2로 읽어서 원본 페이지에 merge
        
        overlay = RLReader(packet)
        page.merge_page(overlay.pages[0])
        writer.add_page(page)

    # 5. 저장
    with open("resources/docs/" + doc_filename, "wb") as f:
        writer.write(f)
    
    

    

    return {
        "message": "문서에 서명 삽입 성공"
    }




@router.get("/{doc_filename}/signer",responses={
    200:{
        "description":"문서에 초대된 서명자 목록 반환",
        "content":{
            "application/json":{
                "example":[
  {
    "signer_id": 6,
    "name": "홍길동",
    "email": "hong@example.com",
    "role": "대표",
    "is_signed": False
  },
  {
    "signer_id": 7,
    "name": "김철수",
    "email": "kim@example.com",
    "role": "부장",
    "is_signed": False
  }
]
                }
            }
        }
    })
async def get_signers_of_document(
    doc_filename: str,
    db: AsyncSession = Depends(get_db)
):
    """
    문서에 초대된 구성원 목록 조회
    """
    # 1. 문서 찾기
    result = await db.execute(
        select(Document).where(Document.stored_filename == doc_filename)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    # 2. 해당 문서에 삽입된 모든 DocumentSigner 조회
    result = await db.execute(
        select(DocumentSigner).where(DocumentSigner.document_id == document.id)
    )
    document_signers = result.scalars().all()

    return [
        {
            "signer_id": signer.id,
            "name": signer.name,
            "email": signer.email,
            "role": signer.role,
            "is_signed": signer.is_signed
        }
        for signer in document_signers
    ]

@router.patch("/{doc_filename}/signer/{signer_id}",responses={
    200:{
        "description":"서명자 상태 변경 성공",
        "content":{
            "application/json":{
                "example":{
                    "message": "사인 상태 변경 성공",
                    "signer_id": 1,
                    "is_signed": True
                }
            }
        }
    }})
async def update_signer_status(
    doc_filename: str,
    signer_id: int,
    body: SignerStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    문서에 초대된 구성원의 서명 여부 변경 (signer_id필요)
    """
    # 1. 문서 찾기
    result = await db.execute(
        select(Document).where(Document.stored_filename == doc_filename)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    # 2. signer 찾기 (해당 문서에 속한 signer만)
    result = await db.execute(
        select(DocumentSigner).where(
            DocumentSigner.id == signer_id,
            DocumentSigner.document_id == document.id
        )
    )
    signer = result.scalar_one_or_none()
    if not signer:
        raise HTTPException(status_code=404, detail="해당 signer를 찾을 수 없습니다.")

    # 3. is_signed 값 변경
    signer.is_signed = body.is_signed
    await db.commit()
    await db.refresh(signer)

    return {
        "message": "사인 상태 변경 성공",
        "signer_id": signer.id,
        "is_signed": signer.is_signed
    }
