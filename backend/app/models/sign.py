from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db import Base

class Sign(Base):
    __tablename__ = "signs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    stored_filename = Column(String(255), unique=True, nullable=False)
    file_url = Column(Text, nullable=False)   # 파일 접근 URL
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # 관계 설정
    user = relationship("User", back_populates="signs")
    #document_signs = relationship("DocumentSign", back_populates="sign", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Signature(id={self.id}, user_id={self.user_id})>"