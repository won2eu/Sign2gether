from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    google_id = Column(String(100), unique=True, nullable=False)
    picture = Column(Text)  # URL이 길 수 있으므로 Text 사용
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # 관계 설정 활성화
    documents = relationship("Document", back_populates="uploader", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', name='{self.name}')>"