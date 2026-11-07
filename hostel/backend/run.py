import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    print(f"🚀 Starting {settings.PROJECT_NAME} on http://127.0.0.1:{settings.PORT}")
    print(f"📚 Interactive Swagger API Docs: http://127.0.0.1:{settings.PORT}/docs")
    print(f"📖 Redoc Documentation: http://127.0.0.1:{settings.PORT}/redoc")
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=settings.PORT,
        reload=False,
    )
