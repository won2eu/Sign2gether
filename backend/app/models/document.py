from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    uploader_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(String(255))
    stored_filename = Column(String(255), unique=True, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # 관계 설정 (선택사항)
    uploader = relationship("User", back_populates="documents")