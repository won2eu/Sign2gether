from app.models.user import User
from app.db import AsyncSessionLocal
from sqlalchemy import select


async def get_user_by_google_id(google_id: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.google_id == google_id)
        )
        return result.scalar_one_or_none()

async def get_user_by_id(user_id: int):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

async def create_or_update_user(userinfo: dict):
    async with AsyncSessionLocal() as session:
        # 구글아이디로 기존 사용자 확인
        existing_user = await get_user_by_google_id(userinfo["id"])
        
        if existing_user:
            # 기존 사용자 정보 업데이트
            existing_user.name = userinfo.get("name", existing_user.name)
            existing_user.picture = userinfo.get("picture", existing_user.picture)
            existing_user.google_id = userinfo.get("id", existing_user.google_id)
            await session.commit()
            #await session.refresh(existing_user)
            return existing_user
        else:
            # 새 사용자 생성
            new_user = User(
                email=userinfo["email"],
                name=userinfo.get("name"),
                picture=userinfo.get("picture"),
                google_id=userinfo.get("id"),
            )
            session.add(new_user)
            await session.commit()
            await session.refresh(new_user)
            return new_user