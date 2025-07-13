from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os

from app.dependencies.database import get_db
from app.models import Sign, DocumentSign
from app.routers.auth import get_current_user_from_cookie

router = APIRouter(prefix="/signs", tags=["signs"])

@router.get("/",responses={
    200:{
        "description":"로그인한 사용자가 업로드한 서명 이미지 목록 반환",
        "content":{
            "application/json":{
                "example":[
  {
    "stored_filename": "sign_893437dd-0070-4f0d-aa83-143ead6f6043.png",
    "file_url": "/resources/signs/sign_893437dd-0070-4f0d-aa83-143ead6f6043.png",
    "uploaded_at": "2025-07-13T05:06:33.210113"
  },
  {
    "stored_filename": "sign_78b47e64-93be-45fc-8244-ef3a99a3e381.png",
    "file_url": "/resources/signs/sign_78b47e64-93be-45fc-8244-ef3a99a3e381.png",
    "uploaded_at": "2025-07-13T06:29:19.056700"
  },
  {
    "stored_filename": "sign_a3478ded-17d1-46c1-bb0d-f5f6419305aa.png",
    "file_url": "/resources/signs/sign_a3478ded-17d1-46c1-bb0d-f5f6419305aa.png",
    "uploaded_at": "2025-07-13T11:27:50.518180"
  },
  {
    "stored_filename": "sign_e4dd1498-fa81-45bf-91a9-63f3f8f2e5a5.png",
    "file_url": "/resources/signs/sign_e4dd1498-fa81-45bf-91a9-63f3f8f2e5a5.png",
    "uploaded_at": "2025-07-13T11:30:45.210874"
  }
]
            }
        }
    }})
async def get_my_signs(
    current_user: dict = Depends(get_current_user_from_cookie),
    db: AsyncSession = Depends(get_db)
):
    """
    로그인한 사용자가 업로드한 서명 이미지 목록 반환
    """
    result = await db.execute(
        select(Sign).where(Sign.user_id == current_user["id"])
    )
    signs = result.scalars().all()
    # 원하는 필드만 추려서 반환
    return [
        {
            "stored_filename": sign.stored_filename,
            "file_url": sign.file_url,
            "uploaded_at": sign.uploaded_at,
        }
        for sign in signs
    ]

@router.delete("/{stored_filename}",responses={
    200:{
        "description":"서명 삭제 성공",
        "content":{
            "application/json":{
                "example":{
                    "message": "서명 삭제 성공",
                    "deleted_filename": "sign_893437dd-0070-4f0d-aa83-143ead6f6043.png"
                }
            }
        }
    }})
async def delete_sign(
    stored_filename: str,
    current_user: dict = Depends(get_current_user_from_cookie),
    db: AsyncSession = Depends(get_db)
):
    """
    파일명(저장된 이름)으로 sign 삭제 (document_sign에서 참조 중이면 삭제 거부)
    """
    # 1. sign 조회
    result = await db.execute(
        select(Sign).where(Sign.stored_filename == stored_filename)
    )
    sign = result.scalar_one_or_none()
    if not sign:
        raise HTTPException(status_code=404, detail="서명을 찾을 수 없습니다.")

    # 2. 권한 확인 (본인 소유만 삭제 가능)
    if sign.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="본인 소유의 서명만 삭제할 수 있습니다.")

    # 3. document_sign에서 참조 중인지 확인
    ref_result = await db.execute(
        select(DocumentSign).where(DocumentSign.sign_id == sign.id)
    )
    ref = ref_result.scalar_one_or_none()
    if ref:
        raise HTTPException(status_code=400, detail="이 서명은 문서에 삽입되어 있어 삭제할 수 없습니다.")

    # 4. 파일 삭제
    file_path = sign.file_url.replace("/resources/signs/", "resources/signs/")
    if os.path.exists(file_path):
        os.remove(file_path)

    # 5. DB에서 삭제
    await db.delete(sign)
    await db.commit()

    return {"message": "서명 삭제 성공", "deleted_filename": stored_filename}
