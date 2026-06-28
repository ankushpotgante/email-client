import os
import json
import logging
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from .env file
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("OpenAIService")

# Read API Key
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

if OPENAI_API_KEY:
    try:
        # Initialize OpenAI client
        client = OpenAI(api_key=OPENAI_API_KEY)
        logger.info("OpenAI API successfully initialized.")
        HAS_OPENAI = True
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI client: {e}. Running in Simulation Mode.")
        HAS_OPENAI = False
else:
    logger.info("No OPENAI_API_KEY found in env or .env file. Running in Simulation/Demo Mode.")
    HAS_OPENAI = False


def call_openai(system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
    """
    Executes a query to the OpenAI chat completions model (gpt-4o-mini).
    Falls back to mock answers if key is missing or call fails.
    """
    if not HAS_OPENAI:
        return get_mock_ai_response(system_prompt, user_prompt, json_mode)
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"} if json_mode else None,
            timeout=10.0 # set timeout to prevent hangs
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        # Proper error handling: log error and fallback to mock responses so main functionality continues
        logger.error(f"OpenAI API call failed: {e}. Falling back to Simulation Mode.")
        return get_mock_ai_response(system_prompt, user_prompt, json_mode)


def get_mock_ai_response(system_prompt: str, user_prompt: str, json_mode: bool) -> str:
    """
    Generates high-fidelity simulated responses for demo/test purposes.
    """
    user_prompt_lower = user_prompt.lower()
    
    # Check if this is a Triaging request
    if "priority" in system_prompt.lower() or "triage" in system_prompt.lower():
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
            
    if json_mode:
        return json.dumps({"text": "AuraMail AI Response"})
    return "AuraMail AI Response"
