

from fastapi import FastAPI
from app.routers import auth, upload, documents, signs, resources
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.db import init_db
import uvicorn
import os



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://sign2gether.vercel.app","http://localhost:3000"],
    allow_credentials=True,  # 이게 중요!
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)

#app.mount("/resources", StaticFiles(directory="resources"), name="resources")
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(documents.router)
app.include_router(signs.router)
app.include_router(resources.router)
@app.on_event("startup")
async def startup_event():
    await init_db()
    print("Database initialized successfully!")