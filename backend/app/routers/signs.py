from collections import namedtuple
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO
import base64   
from app.dependencies.database import get_db
from app.models import Sign
from app.routers.auth import get_current_user_from_cookie
from dotenv import load_dotenv
from fastapi import Query
from fastapi.websockets import WebSocket, WebSocketDisconnect

sessions ={}

load_dotenv()

def set_white_bg_and_b64(image_bytes, threshold=220):
    # 1. 이미지 열기
    img = Image.open(BytesIO(image_bytes)).convert("RGBA")
    datas = img.getdata()
    newData = []
    for item in datas:
        # 밝은색(흰색~밝은 회색) 픽셀을 투명하게
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            newData.append((255, 255, 255, 255))  # 완전 흰색
        else:
            newData.append(item)
    img.putdata(newData)

    # 2. 다시 PNG bytes로 저장
    output = BytesIO()
    img.save(output, format="PNG")
    png_bytes = output.getvalue()

    # 3. base64 인코딩
    b64_str = base64.b64encode(png_bytes).decode("utf-8")
    b64_png = f"data:image/png;base64,{b64_str}"
    return b64_png

router = APIRouter(prefix="/signs", tags=["signs"])

@router.get("/",responses={
    200:{
        "description":"로그인한 사용자가 업로드한 서명 이미지 목록 반환",
        "content":{
            "application/json":{
                "example":[
  {
    "sign_filename": "sign_893437dd-0070-4f0d-aa83-143ead6f6043.png",
    "file_url": "/resources/signs/sign_893437dd-0070-4f0d-aa83-143ead6f6043.png",
    "uploaded_at": "2025-07-13T05:06:33.210113"
  },
  {
    "sign_filename": "sign_78b47e64-93be-45fc-8244-ef3a99a3e381.png",
    "file_url": "/resources/signs/sign_78b47e64-93be-45fc-8244-ef3a99a3e381.png",
    "uploaded_at": "2025-07-13T06:29:19.056700"
  },
  {
    "sign_filename": "sign_a3478ded-17d1-46c1-bb0d-f5f6419305aa.png",
    "file_url": "/resources/signs/sign_a3478ded-17d1-46c1-bb0d-f5f6419305aa.png",
    "uploaded_at": "2025-07-13T11:27:50.518180"
  },
  {
    "sign_filename": "sign_e4dd1498-fa81-45bf-91a9-63f3f8f2e5a5.png",
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
            "sign_filename": sign.stored_filename,
            "file_url": sign.file_url,
            "uploaded_at": sign.uploaded_at,
        }
        for sign in signs
    ]

@router.delete("/{sign_filename}",responses={
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
    sign_filename: str,
    current_user: dict = Depends(get_current_user_from_cookie),
    db: AsyncSession = Depends(get_db)
):
    """
    파일명(저장된 이름)으로 sign 삭제 (document_sign에서 참조 중이면 삭제 거부)
    """
    # 1. sign 조회
    result = await db.execute(
        select(Sign).where(Sign.stored_filename == sign_filename)
    )
    sign = result.scalar_one_or_none()
    if not sign:
        raise HTTPException(status_code=404, detail="서명을 찾을 수 없습니다.")

    # 2. 권한 확인 (본인 소유만 삭제 가능)
    if sign.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="본인 소유의 서명만 삭제할 수 있습니다.")

    # 3. document_sign에서 참조 중인지 확인
    
    # 4. 파일 삭제
    file_path = sign.file_url.replace("/resources/signs/", "resources/signs/")
    if os.path.exists(file_path):
        os.remove(file_path)

    # 5. DB에서 삭제
    await db.delete(sign)
    await db.commit()

    return {"message": "서명 삭제 성공", "deleted_filename": sign_filename}


@router.get("/generate/{name}",responses={
    200:{
        "description":"서명 생성 성공",
        "content":{
            "application/json":{
                "example":{
                    "message": "서명 생성 성공",
                    "sign_base64": "base64"
                }
            }
        }
    }})
async def generate_sign(
    name: str,
    current_user: dict = Depends(get_current_user_from_cookie)
):
    """
    서명 생성
    """
    client = genai.Client(api_key=os.getenv("GEMINI_APIKEY"))
    contents=("Generate a high-resolution PNG image of a handwritten signature for the name "+name+". Use a black ballpoint pen style, with a white background. The signature should appear natural, slightly slanted, and fluid, resembling a real personal signature.")
    response = client.models.generate_content(
        model="gemini-2.0-flash-preview-image-generation",
        contents=contents,
        config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE']
        )
    )

    for part in response.candidates[0].content.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            b64_png = set_white_bg_and_b64(part.inline_data.data)
            return {"message": "서명 생성 성공", "sign_base64": b64_png}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, sessionId: str):
    await websocket.accept()
    sessions.setdefault(sessionId, []).append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            for conn in sessions[sessionId]:
                if conn != websocket:
                    await conn.send_text(data)
    except WebSocketDisconnect:
        sessions[sessionId].remove(websocket)

"""
@router.get("/whitebg")
async def whitebg(image: str = Query(..., description="base64 PNG 이미지 데이터")):
    try:
        if "base64," in image:
            image_data = image.split(",")[1]
        else:
            image_data = image
        image_bytes = base64.b64decode(image_data)
        img = Image.open(BytesIO(image_bytes))
        client = genai.Client(api_key=os.getenv("GEMINI_APIKEY"))
        text_input=("Generate a high-resolution PNG image of a handwritten signature for the name "+name+". Use a black ballpoint pen style, with a white background. The signature should appear natural, slightly slanted, and fluid, resembling a real personal signature.")
        response = client.models.generate_content(
            model="gemini-2.0-flash-preview-image-generation",
            contents=contents,
            config=types.GenerateContentConfig(
            response_modalities=['TEXT', 'IMAGE']
            )
        )

        for part in response.candidates[0].content.parts:
            if part.text is not None:
                print(part.text)
            elif part.inline_data is not None:
                b64_png = set_white_bg_and_b64(part.inline_data.data)
                return {"message": "서명 생성 성공", "sign_base64": b64_png}

    except Exception as e:
        raise HTTPException(status_code=400, detail="이미지 데이터 처리 중 오류가 발생했습니다.")
    return {"message": "이미지 데이터 처리 성공", "image": img}
"""

