from fastapi import APIRouter, HTTPException, Depends
import json
from pydantic import BaseModel
from api.models import DraftRequest, DraftResponse
from api.db.database import db_instance as db
from api.auth import get_current_user
from api.agents.agent_os import triage_agent, summary_agent, drafting_agent

router = APIRouter(prefix="/ai", tags=["AI Integration"])

class AIRequest(BaseModel):
    emailId: str

@router.post("/prioritize")
def prioritize_email(request: AIRequest, user_id: str = Depends(get_current_user)):
    email = db.get_email_by_id(user_id, request.emailId)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
        
    email_text = f"From: {email.get('from_name')} <{email.get('from_email')}>\nSubject: {email.get('subject')}\nBody: {email.get('body')}"
    
    try:
        triage_json = triage_agent.run(email_text, json_mode=True)
        triage_result = json.loads(triage_json)
        
        priority = triage_result.get("priority", "medium")
        priority_reason = triage_result.get("reason", "Standard email importance.")
        
        db.update_email_triage(user_id, request.emailId, priority, priority_reason)
        
        return {
            "emailId": request.emailId,
            "priority": priority,
            "priorityReason": priority_reason
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Triage failed: {str(e)}")

@router.post("/summarize")
def summarize_email(request: AIRequest, user_id: str = Depends(get_current_user)):
    email = db.get_email_by_id(user_id, request.emailId)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
        
    # Return existing summary if already populated and not empty
    if email.get("summary"):
        return {"emailId": request.emailId, "summary": email.get("summary")}
        
    email_text = f"From: {email.get('from_name')} <{email.get('from_email')}>\nSubject: {email.get('subject')}\nBody: {email.get('body')}"
    
    try:
        summary_text = summary_agent.run(email_text, json_mode=False)
        db.update_email_summary(user_id, request.emailId, summary_text)
        
        return {
            "emailId": request.emailId,
            "summary": summary_text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Summarization failed: {str(e)}")

@router.post("/draft-reply", response_model=DraftResponse)
def draft_reply(request: DraftRequest, user_id: str = Depends(get_current_user)):
    email = db.get_email_by_id(user_id, request.emailId)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
        
    email_text = f"From: {email.get('from_name')} <{email.get('from_email')}>\nSubject: {email.get('subject')}\nBody: {email.get('body')}"
    
    # Construct instructions for drafting
    user_instruction = f"Original Email:\n{email_text}\n\n"
    if request.prompt:
        user_instruction += f"User's Response Goal:\n{request.prompt}\n\n"
    user_instruction += f"Preferred Response Tone: {request.tone}\n"
    
    try:
        draft_text = drafting_agent.run(user_instruction, json_mode=False)
        return DraftResponse(body=draft_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Drafting failed: {str(e)}")


class SmartSuggestionsRequest(BaseModel):
    emailId: str

@router.post("/smart-suggestions")
def get_smart_suggestions(request: SmartSuggestionsRequest, user_id: str = Depends(get_current_user)):
    email = db.get_email_by_id(user_id, request.emailId)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    email_text = f"From: {email.get('from_name')} <{email.get('from_email')}>\nSubject: {email.get('subject')}\nBody: {email.get('body', '')[:500]}"
    
    system_prompt = """You are an email assistant. Based on the email content provided, generate exactly 3 short, contextually relevant quick-reply suggestions.

Respond ONLY with a JSON array of 3 objects. Each object must have:
- label: short button label (max 4 words)
- prompt: brief instruction for drafting the reply (max 15 words)

Example format:
[{"label": "Confirm Meeting", "prompt": "Confirm the meeting and ask for agenda details."}, ...]"""
    
    try:
        from api.ai.openai_service import call_openai
        response = call_openai(
            system_prompt=system_prompt,
            user_prompt=f"Email to reply to:\n{email_text}",
            json_mode=True
        )
        suggestions = json.loads(response)
        if not isinstance(suggestions, list):
            raise ValueError("Response is not a list")
        return {"suggestions": suggestions[:3]}
    except Exception as e:
        # Fallback to generic suggestions if LLM fails
        return {
            "suggestions": [
                {"label": "Acknowledge & Confirm", "prompt": "Acknowledge receipt and confirm action."},
                {"label": "Request More Time", "prompt": "Politely request more time to review."},
                {"label": "Schedule a Call", "prompt": "Suggest scheduling a quick call to discuss."}
            ]
        }
