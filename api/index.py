from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from api.routes.emails import router as emails_router
from api.routes.ai import router as ai_router
from api.routes.auth import router as auth_router

@asynccontextmanager
async def lifespan(app):
    # Ensure dummy user exists for demo purposes
    from api.routes.auth import ensure_dummy_account
    ensure_dummy_account()
    yield

app = FastAPI(
    title="AuraMail API", 
    description="AI-First Universal Email Client Backend (Python & FastAPI)", 
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# Configure CORS for local Next.js client-side requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under prefix '/api'
app.include_router(emails_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(auth_router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AuraMail API Server",
        "supported_accounts": ["gmail", "office365", "imap"]
    }
