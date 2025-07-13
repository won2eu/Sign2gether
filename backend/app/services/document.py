from app.models.document import Document
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import os
import uuid

async def create_document(
    db: AsyncSession,
    uploader_id: int,
    original_filename: str,
    stored_filename: str,
    file_path: str,
    file_url: str,
    file_size: int,
    mime_type: str
):
    """문서 정보를 DB에 저장"""
    document = Document(
        uploader_id=uploader_id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        file_path=file_path,
        file_url=file_url,
        file_size=file_size,
        mime_type=mime_type,
        uploaded_at=datetime.utcnow()
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    return document

async def get_documents_by_user(db: AsyncSession, user_id: int):
    """사용자의 문서 목록 조회"""
    result = await db.execute(
        select(Document).where(Document.uploader_id == user_id)
    )
    return result.scalars().all()

async def get_document_by_filename(db: AsyncSession, stored_filename: str):
    """파일명으로 문서 조회"""
    result = await db.execute(
        select(Document).where(Document.stored_filename == stored_filename)
    )
    return result.scalar_one_or_none()

async def delete_document(db: AsyncSession, document_id: int, user_id: int):
    """문서 삭제 (업로더만 가능)"""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.uploader_id == user_id
        )
    )
    document = result.scalar_one_or_none()
    
    if document:
        # 파일 삭제
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
        
        # DB에서 삭제
        await db.delete(document)
        await db.commit()
        return True
    return False