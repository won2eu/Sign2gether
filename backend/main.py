

from fastapi import FastAPI
from app.routers import auth
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,  # 이게 중요!
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
