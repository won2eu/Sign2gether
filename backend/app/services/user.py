from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

async def get_user_by_google_id(db: AsyncSession, google_id: str):
    result = await db.execute(
        select(User).where(User.google_id == google_id)
    )
    return result.scalar_one_or_none()

async def get_user_by_id(db: AsyncSession, user_id: int):
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()

async def create_or_update_user(db: AsyncSession, userinfo: dict):
    # 구글아이디로 기존 사용자 확인
    existing_user = await get_user_by_google_id(db, userinfo["id"])
    
    if existing_user:
        # 기존 사용자 정보 업데이트
        existing_user.name = userinfo.get("name", existing_user.name)
        existing_user.picture = userinfo.get("picture", existing_user.picture)
        existing_user.google_id = userinfo.get("id", existing_user.google_id)
        await db.commit()
        return existing_user
    else:
        # 새 사용자 생성
        new_user = User(
            email=userinfo["email"],
            name=userinfo.get("name"),
            picture=userinfo.get("picture"),
            google_id=userinfo.get("id"),
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user