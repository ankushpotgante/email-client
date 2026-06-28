import os
import json
import logging
from typing import Dict, Any, Optional
import google.generativeai as genai

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GeminiAI")

# Read API Key
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        # Use gemini-1.5-flash for fast and cost-effective operations
        model = genai.GenerativeModel("gemini-1.5-flash")
        logger.info("Gemini AI successfully initialized with API Key.")
        HAS_GEMINI = True
    except Exception as e:
        logger.error(f"Failed to configure Gemini SDK: {e}. Falling back to Simulation Mode.")
        HAS_GEMINI = False
else:
    logger.info("No GEMINI_API_KEY found in environment. Running in Demo/Simulation Mode.")
    HAS_GEMINI = False


def call_gemini(system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
    """
    Executes a query to the Gemini model with a system prompt.
    Falls back to mock answers if Gemini API is not configured.
    """
    if not HAS_GEMINI:
        return get_mock_ai_response(system_prompt, user_prompt, json_mode)
    
    try:
        # We can pass system instructions and user instructions
        # In python google-generativeai, GenerativeModel takes system_instruction at construction
        # Or we can combine system prompt and user prompt
        combined_model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_prompt,
            generation_config={"response_mime_type": "application/json"} if json_mode else None
        )
        
        response = combined_model.generate_content(user_prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini API invocation failed: {e}. Falling back to simulation output.")
        return get_mock_ai_response(system_prompt, user_prompt, json_mode)


def get_mock_ai_response(system_prompt: str, user_prompt: str, json_mode: bool) -> str:
    """
    Generates high-fidelity simulated responses for demo/test purposes.
    """
    user_prompt_lower = user_prompt.lower()
    
    # Check if this is a Triaging request
    if "priority" in system_prompt.lower() or "triage" in system_prompt.lower():
        # Look for keywords in the email details to give an smart priority classification
        priority = "medium"
        reason = "A standard message requiring review during normal business hours."
        
        if any(w in user_prompt_lower for w in ["urgent", "action required", "critical", "outage", "term sheet", "expire"]):
            priority = "high"
            reason = "High importance: Requires immediate attention due to time-sensitive requests or service disruption warnings."
        elif any(w in user_prompt_lower for w in ["newsletter", "digest", "advisory", "maintenance", "discount", "offer"]):
            priority = "low"
            reason = "Low importance: This is an informational newsletter or bulk Campus update that doesn't need reply."
        elif "mom" in user_prompt_lower or "lasagna" in user_prompt_lower:
            priority = "high"
            reason = "High importance: Personal family check-in regarding Sunday plans and catering details."
            
        if json_mode:
            return json.dumps({"priority": priority, "reason": reason})
        return f"Priority: {priority}\nReason: {reason}"
        
    # Check if this is a Summarization request
    elif "summarize" in system_prompt.lower() or "summary" in system_prompt.lower():
        # Match common items in mock data or construct general summary
        if "term sheet" in user_prompt_lower:
            summary = "- Sarah Jenkins from Ventures VC sent the finalized Seed Term Sheet for AuraMail.\n- Requests review and a conference call today at 3:00 PM EST.\n- Warns the term sheet has a 24-hour expiration clause."
        elif "database cpu" in user_prompt_lower:
            summary = "- AWS CloudWatch warning reports Prod Database CPU utilization has exceeded 95% threshold.\n- Current utilization spiked to 98.4% in us-east-1.\n- Immediate sysops investigation requested to prevent service interruption."
        elif "slide" in user_prompt_lower or "vp" in user_prompt_lower:
            summary = "- VP David Harris requests Q3 strategy slide submissions by 9:00 AM tomorrow.\n- Roadmaps for adding agentic features to email products must be highlighted.\n- Budget allocations for next fiscal year are at risk if slides are delayed."
        elif "lasagna" in user_prompt_lower:
            summary = "- Mom invites Alex to Sunday dinner, making lasagna.\n- Asks Alex to pick up garlic bread from the local bakery and confirm if friends are coming."
        else:
            summary = "- The sender is contacting you regarding details in the message body.\n- Contains standard contextual information requiring follow-up.\n- No immediate high-risk urgency detected."
            
        if json_mode:
            return json.dumps({"summary": summary})
        return summary

    # Check if this is a Drafting request
    elif "draft" in system_prompt.lower() or "reply" in system_prompt.lower():
        # Parse the requested tone
        tone = "professional"
        if "casual" in user_prompt_lower:
            tone = "casual"
        elif "friendly" in user_prompt_lower:
            tone = "friendly"
        elif "urgent" in user_prompt_lower:
            tone = "urgent"

        if "term sheet" in user_prompt_lower:
            if tone == "casual":
                return "Hi Sarah!\n\nAwesome news, thanks for getting this over. I'll read through it with the team and our lawyer today. 3:00 PM EST works great, speak then!\n\nBest,\nAlex"
            elif tone == "friendly":
                return "Hi Sarah,\n\nThank you so much for the exciting news! We are thrilled to receive the term sheet. I will review it with the team and our lawyers this morning. We'd love to hop on a call at 3:00 PM EST today to discuss details. Talk to you soon!\n\nWarmly,\nAlex"
            else:
                return "Dear Sarah,\n\nThank you for transmitting the seed round term sheet. I will review the documents alongside our co-founders and legal counsel this afternoon. I confirm that I am available for our scheduled discussion at 3:00 PM EST today. I look forward to speaking then.\n\nSincerely,\nAlex Rivers"
        elif "lasagna" in user_prompt_lower:
            if tone == "casual":
                return "Hey Mom! Lasagna sounds amazing, I'll definitely be there! I'll pick up the garlic bread on my way. See you Sunday!\n\nLove,\nAlex"
            else:
                return "Hi Mom,\n\nThank you for the invitation, I'd love to join you for dinner this Sunday! Lasagna sounds wonderful. I'll make sure to stop by the bakery and pick up the garlic bread. I'll be coming alone this time. See you then!\n\nLove,\nAlex"
        elif "slide" in user_prompt_lower:
            return "Hi David,\n\nI received your request. I am wrapping up the Q3 roadmap slides for our agentic email workflow integrations now. I will upload the link to the shared SharePoint directory well before the 9:00 AM deadline tomorrow.\n\nBest regards,\nAlex"
        else:
            if tone == "casual":
                return "Hey! Thanks for writing. Got your message and I'm on it. Will let you know once I have an update. Catch you later!"
            else:
                return "Hello,\n\nThank you for reaching out. I have received your email and am currently looking into the details. I will follow up with you as soon as I have a formal update.\n\nBest regards,\nAlex Rivers"
            
    # Default fallback
    if json_mode:
        return json.dumps({"text": "AuraMail AI Response"})
    return "AuraMail AI Response"
