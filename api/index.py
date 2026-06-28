import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

# Resolve Next.js static export paths
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
out_dir = os.path.join(project_root, "out")

# Serve Next.js SPA frontend directly from the FastAPI server if built
if os.path.exists(out_dir):
    # Mount the next-static files (JS, CSS, etc.)
    next_static_dir = os.path.join(out_dir, "_next")
    if os.path.exists(next_static_dir):
        app.mount("/_next", StaticFiles(directory=next_static_dir), name="next-static")
        
    # Catch-all handler to serve index.html for SPA router paths, or static assets
    @app.get("/{path_name:path}")
    async def serve_spa_frontend(path_name: str):
        # Prevent accessing files outside of out_dir
        file_path = os.path.join(out_dir, path_name)
        if not path_name or not os.path.exists(file_path) or os.path.isdir(file_path):
            index_path = os.path.join(out_dir, "index.html")
            if os.path.exists(index_path):
                return FileResponse(index_path)
                
        if os.path.exists(file_path):
            return FileResponse(file_path)
            
        # Fallback to index.html
        return FileResponse(os.path.join(out_dir, "index.html"))

