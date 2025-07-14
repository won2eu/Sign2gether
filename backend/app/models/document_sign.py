from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from ..db import Base

class DocumentSign(Base):
    __tablename__ = "document_signs"
    
    id = Column(Integer, primary_key=True, index=True)
    sign_id = Column(Integer, ForeignKey("signs.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    x = Column(Float, nullable=False)  # 서명의 x 좌표 (0~100)
    y = Column(Float, nullable=False)  # 서명의 y 좌표 (0~100)
    width = Column(Float, nullable=False)  # 폭 (0~100)
    height = Column(Float, nullable=False)  # 높이 (0~100)
    num_page = Column(Integer, nullable=False, default=1)  # 서명이 위치한 페이지 번호
    
    # 관계 설정
    sign = relationship("Sign", back_populates="document_signs")
    document = relationship("Document", back_populates="document_signs")
    
    def __repr__(self):
        return f"<DocumentSign(id={self.id}, sign_id={self.sign_id}, document_id={self.document_id}, page={self.num_page})>"
