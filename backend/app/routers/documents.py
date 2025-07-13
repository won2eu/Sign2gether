from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os

from app.dependencies.database import get_db
from app.models import Document, Sign, DocumentSign
from app.routers.auth import get_current_user_from_cookie

router = APIRouter(prefix="/documents", tags=["documents"])

@router.get("/")
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
            "stored_filename": doc.stored_filename,
            "file_url": doc.file_url,
            "uploaded_at": doc.uploaded_at,
            "file_size": doc.file_size,
            "mime_type": doc.mime_type,
        }
        for doc in documents
    ]

@router.delete("/{stored_filename}")
async def delete_document(
    stored_filename: str,
    current_user: dict = Depends(get_current_user_from_cookie),
    db: AsyncSession = Depends(get_db)
):
    """
    파일명(저장된 이름)으로 문서 삭제
    """
    result = await db.execute(
        select(Document).where(Document.stored_filename == stored_filename)
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

    return {"message": "문서 삭제 성공", "deleted_filename": stored_filename}

@router.post("/{doc_filename}/sign/{sign_filename}")
async def insert_sign_to_document(
    doc_filename: str,
    sign_filename: str,
    body: dict,
    db: AsyncSession = Depends(get_db)
):
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
        x_ratio=body["x_ratio"],
        y_ratio=body["y_ratio"],
        num_page=body["num_page"]
    )
    db.add(doc_sign)
    await db.commit()
    await db.refresh(doc_sign)

    return {
        "message": "문서에 서명 삽입 성공",
        "document_sign_id": doc_sign.id
    }

@router.get("/{doc_filename}/sign")
async def get_signs_of_document(
    doc_filename: str,
    db: AsyncSession = Depends(get_db)
):
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
            "stored_filename": sign.stored_filename,
            "file_url": sign.file_url,
            "x": doc_sign.x,
            "y": doc_sign.y,
            "x_ratio": doc_sign.x_ratio,
            "y_ratio": doc_sign.y_ratio,
            "num_page": doc_sign.num_page
        }
        for doc_sign, sign in doc_signs
    ]

@router.delete("/{doc_filename}/{doc_sign_id}")
async def delete_document_sign(
    doc_filename: str,
    doc_sign_id: int,
    db: AsyncSession = Depends(get_db)
):
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
