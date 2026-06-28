from fastapi import APIRouter

router = APIRouter(prefix="/ai", tags=["AI"])

@router.get("/status")
def ai_status():
    return {"status": "stub", "engine": "Gemini AI Engine"}
