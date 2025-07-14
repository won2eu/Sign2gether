# backend/app/models/__init__.py
from ..db import Base

# 모든 모델을 여기서 import하여 Base에 등록
from .user import User
from .document import Document
from .sign import Sign
from .document_signer import DocumentSigner

__all__ = ["Base", "User", "Document", "Sign", "DocumentSigner"]