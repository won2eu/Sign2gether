

from fastapi import FastAPI
from app.routers import auth, upload, documents, signs
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.db import init_db
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,  # 이게 중요!
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/resources", StaticFiles(directory="resources"), name="resources")
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(documents.router)
app.include_router(signs.router)

@app.on_event("startup")
async def startup_event():
    await init_db()
    print("Database initialized successfully!")