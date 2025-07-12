from app.models.document import Document
from app.db import AsyncSessionLocal
from sqlalchemy import select
from datetime import datetime

async def create_document(
    uploader_id: int,
    original_filename: str,
    stored_filename: str
):
    """문서 정보를 DB에 저장"""
    async with AsyncSessionLocal() as session:
        document = Document(
            uploader_id=uploader_id,
            original_filename=original_filename,
            stored_filename=stored_filename,
            uploaded_at=datetime.utcnow()
        )
        session.add(document)
        await session.commit()
        await session.refresh(document)
        return document

async def get_documents_by_user(user_id: int):
    """사용자의 문서 목록 조회"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Document).where(Document.uploader_id == user_id)
        )
        return result.scalars().all()

async def get_document_by_filename(stored_filename: str):
    """파일명으로 문서 조회"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Document).where(Document.stored_filename == stored_filename)
        )
        return result.scalar_one_or_none()

async def delete_document(document_id: int, user_id: int):
    """문서 삭제 (업로더만 가능)"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Document).where(
                Document.id == document_id,
                Document.uploader_id == user_id
            )
        )
        document = result.scalar_one_or_none()
        
        if document:
            await session.delete(document)
            await session.commit()
            return True
        return False