from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db import Base


class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    uploader_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), unique=True, nullable=False)
    file_path = Column(Text, nullable=False)  # 파일 저장 경로
    file_size = Column(Integer)  # 파일 크기 (bytes)
    mime_type = Column(String(100))  # MIME 타입
    file_url = Column(Text, nullable=False)   # 파일 접근 URL
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # 관계 설정 활성화
    uploader = relationship("User", back_populates="documents")
    signers = relationship("DocumentSigner", back_populates="document", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Document(id={self.id}, filename='{self.original_filename}', uploader_id={self.uploader_id})>"