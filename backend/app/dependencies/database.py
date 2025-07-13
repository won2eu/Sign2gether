from sqlalchemy.ext.asyncio import AsyncSession
from app.db import AsyncSessionLocal

async def get_db() -> AsyncSession:
    """
    데이터베이스 세션 의존성
    각 요청마다 새로운 세션을 생성하고 요청 완료 후 자동으로 닫힘
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close() 