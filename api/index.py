from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes.emails import router as emails_router
from api.routes.ai import router as ai_router

app = FastAPI(
    title="AuraMail API", 
    description="AI-First Universal Email Client Backend (Python & FastAPI)", 
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
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

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AuraMail API Server",
        "supported_accounts": ["gmail", "office365", "imap"]
    }
