from fastapi import APIRouter, HTTPException
import json
from pydantic import BaseModel
from api.models import DraftRequest, DraftResponse
from api.db.mock_data import db
from api.agents.agent_os import triage_agent, summary_agent, drafting_agent

router = APIRouter(prefix="/ai", tags=["AI Integration"])

class AIRequest(BaseModel):
    emailId: str

@router.post("/prioritize")
def prioritize_email(request: AIRequest):
    email = db.get_email_by_id(request.emailId)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
        
    email_text = f"From: {email.from_name} <{email.from_email}>\nSubject: {email.subject}\nBody: {email.body}"
    
    try:
        triage_json = triage_agent.run(email_text, json_mode=True)
        triage_result = json.loads(triage_json)
        
        email.priority = triage_result.get("priority", "medium")
        email.priority_reason = triage_result.get("reason", "Standard email importance.")
        
        return {
            "emailId": email.id,
            "priority": email.priority,
            "priorityReason": email.priority_reason
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Triage failed: {str(e)}")

@router.post("/summarize")
def summarize_email(request: AIRequest):
    email = db.get_email_by_id(request.emailId)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
        
    # Return existing summary if already populated and not empty
    if email.summary:
        return {"emailId": email.id, "summary": email.summary}
        
    email_text = f"From: {email.from_name} <{email.from_email}>\nSubject: {email.subject}\nBody: {email.body}"
    
    try:
        summary_text = summary_agent.run(email_text, json_mode=False)
        email.summary = summary_text
        
        return {
            "emailId": email.id,
            "summary": email.summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Summarization failed: {str(e)}")

@router.post("/draft-reply", response_model=DraftResponse)
def draft_reply(request: DraftRequest):
    email = db.get_email_by_id(request.emailId)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
        
    email_text = f"From: {email.from_name} <{email.from_email}>\nSubject: {email.subject}\nBody: {email.body}"
    
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
