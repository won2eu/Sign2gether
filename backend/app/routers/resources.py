from fastapi import APIRouter, Response, HTTPException
import os
import mimetypes

router = APIRouter()

@router.get("/resources/{file_path:path}")
async def serve_resource(file_path: str):
    # 실제 파일 경로
    abs_path = os.path.join("resources", file_path)
    if not os.path.isfile(abs_path):
        raise HTTPException(status_code=404, detail="File not found")

    # 파일 읽기
    with open(abs_path, "rb") as f:
        content = f.read()

    # MIME 타입 추정
    mime_type, _ = mimetypes.guess_type(abs_path)
    if not mime_type:
        mime_type = "application/octet-stream"

    # Response에 CORS 헤더 추가
    headers = {
        "Access-Control-Allow-Origin": "https://sign2gether.vercel.app",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*"
    }
    return Response(content, media_type=mime_type, headers=headers)