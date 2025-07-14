from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os
from pydantic import BaseModel

from app.dependencies.database import get_db
from app.models import Document, Sign, DocumentSign, DocumentSigner
from app.routers.auth import get_current_user_from_cookie

router = APIRouter(prefix="/documents", tags=["documents"])

class SignerStatusUpdate(BaseModel):
    is_signed: bool

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

@router.post("/{doc_filename}/sign/{sign_filename}",responses={
    200:{
        "description":"서명 삽입 성공",
        "content":{
            "application/json":{
                "example":{
                    "message": "문서에 서명 삽입 성공",
                    "doc_sign_id": 1
                }
            }
        }
    }})
async def insert_sign_to_document(
    doc_filename: str,
    sign_filename: str,
    body: dict = Body(...,description="서명 삽입 정보",examples=[{"x":100,"y":100,"width":10,"height":10,"num_page":1}]),
    db: AsyncSession = Depends(get_db)
):
    """
    문서에 서명 삽입 (doc_filename, sign_filename, 위치값과 비율, 페이지번호 필요)
    """
    # 1. 문서 찾기
    result = await db.execute(
        select(Document).where(Document.stored_filename == doc_filename)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    # 2. 사인 찾기
    result = await db.execute(
        select(Sign).where(Sign.stored_filename == sign_filename)
    )
    sign = result.scalar_one_or_none()
    if not sign:
        raise HTTPException(status_code=404, detail="서명을 찾을 수 없습니다.")

    # 3. DocumentSign 생성
    doc_sign = DocumentSign(
        sign_id=sign.id,
        document_id=document.id,
        x=body["x"],
        y=body["y"],
        width=body["width"],
        height=body["height"],
        num_page=body["num_page"]
    )
    db.add(doc_sign)
    await db.commit()
    await db.refresh(doc_sign)

    return {
        "message": "문서에 서명 삽입 성공",
        "doc_sign_id": doc_sign.id
    }

@router.get("/{doc_filename}/sign",responses={
    200:{
        "description":"문서에 삽입된 서명 목록 반환",
        "content":{
            "application/json":{
                "example":[
  {
    "doc_sign_id": 5,
    "sign_filename": "sign_893437dd-0070-4f0d-aa83-143ead6f6043.png",
    "file_url": "/resources/signs/sign_893437dd-0070-4f0d-aa83-143ead6f6043.png",
    "x": 100,
    "y": 100,   
    "width": 10,
    "height": 10,
    "num_page": 1
  },
  {
    "doc_sign_id": 3,
    "sign_filename": "sign_78b47e64-93be-45fc-8244-ef3a99a3e381.png",
    "file_url": "/resources/signs/sign_78b47e64-93be-45fc-8244-ef3a99a3e381.png",
    "x": 100,
    "y": 200,
    "width": 10,
    "height": 10,
    "num_page": 1
  }
]
            }
        }
    }})
async def get_signs_of_document(
    doc_filename: str,
    db: AsyncSession = Depends(get_db)
):
    """
    문서에 삽입된 서명 목록 반환 (doc_sign_id중요하니 기억하기)
    """
    # 1. 문서 찾기
    result = await db.execute(
        select(Document).where(Document.stored_filename == doc_filename)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    # 2. 해당 문서에 삽입된 모든 DocumentSign 조회 (JOIN으로 Sign 정보도 함께)
    result = await db.execute(
        select(DocumentSign, Sign)
        .join(Sign, DocumentSign.sign_id == Sign.id)
        .where(DocumentSign.document_id == document.id)
    )
    doc_signs = result.all()

    # 3. 원하는 정보만 추려서 반환
    return [
        {
            "doc_sign_id": doc_sign.id,
            "sign_filename": sign.stored_filename,
            "file_url": sign.file_url,
            "x": doc_sign.x,
            "y": doc_sign.y,
            "width": doc_sign.width,
            "height": doc_sign.height,
            "num_page": doc_sign.num_page
        }
        for doc_sign, sign in doc_signs
    ]

@router.delete("/{doc_filename}/{doc_sign_id}",responses={
    200:{
        "description":"문서에서 서명 삭제 성공",
        "content":{
            "application/json":{
                "example":{
                    "message": "문서에서 서명 삭제 성공",
                    "deleted_doc_sign_id": 1
                }
            }
        }
    }})
async def delete_document_sign(
    doc_filename: str,
    doc_sign_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    문서에 삽입된 서명 삭제 (doc_sign_id필요)
    """
    # 1. 문서 찾기
    result = await db.execute(
        select(Document).where(Document.stored_filename == doc_filename)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    # 2. document_signs에서 해당 레코드 찾기 (문서와 연결된 것만)
    result = await db.execute(
        select(DocumentSign).where(
            DocumentSign.id == doc_sign_id,
            DocumentSign.document_id == document.id
        )
    )
    doc_sign = result.scalar_one_or_none()
    if not doc_sign:
        raise HTTPException(status_code=404, detail="해당 문서에 연결된 서명 정보를 찾을 수 없습니다.")

    # 3. 삭제
    await db.delete(doc_sign)
    await db.commit()

    return {"message": "문서에서 서명 삭제 성공", "deleted_doc_sign_id": doc_sign_id}

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
