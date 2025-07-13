from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from ..db import Base

class DocumentSigner(Base):
    __tablename__ = "document_signers"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=True)
    role = Column(String(255), nullable=True)
    is_signed = Column(Boolean, default=False)
    # 필요하다면 상태(status) 등도 추가 가능

    document = relationship("Document", back_populates="signers")
