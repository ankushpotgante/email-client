import json
import logging
from typing import Dict, List, Any, Callable, Optional
from api.ai.openai_service import call_openai

logger = logging.getLogger("AgentOS")

class Skill:
    """
    Represents an action or capability that an agent can execute.
    """
    def __init__(self, name: str, description: str, func: Callable[..., Any]):
        self.name = name
        self.description = description
        self.func = func

    def execute(self, *args, **kwargs) -> Any:
        try:
            logger.info(f"Executing skill '{self.name}'")
            return self.func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error executing skill '{self.name}': {e}")
            raise e

class Agent:
    """
    Represents an autonomous entity with a role, system instructions, and bound skills.
    """
    def __init__(self, name: str, role: str, system_prompt: str):
        self.name = name
        self.role = role
        self.system_prompt = system_prompt
        self.skills: Dict[str, Skill] = {}

    def bind_skill(self, skill: Skill):
        self.skills[skill.name] = skill
        logger.info(f"Bound skill '{skill.name}' to agent '{self.name}'")

    def run(self, user_prompt: str, json_mode: bool = False) -> str:
        logger.info(f"Agent '{self.name}' executing task...")
        # Incorporate skill capabilities into the system instructions if needed
        skills_description = "\n".join([f"- Skill '{s.name}': {s.description}" for s in self.skills.values()])
        full_system_prompt = f"{self.system_prompt}\n\nYou have access to the following skills:\n{skills_description}" if self.skills else self.system_prompt
        
        # Call the OpenAI skill (or direct execution)
        return call_openai(full_system_prompt, user_prompt, json_mode)

class AgentOSRegistry:
    """
    Global coordinator for discovering agents, registering skills, and executing event hooks.
    """
    def __init__(self):
        self.agents: Dict[str, Agent] = {}
        self.skills: Dict[str, Skill] = {}
        self.hooks: Dict[str, List[Callable[..., Any]]] = {}

    def register_agent(self, agent: Agent):
        self.agents[agent.name] = agent
        logger.info(f"Registered agent: {agent.name}")

    def register_skill(self, skill: Skill):
        self.skills[skill.name] = skill
        logger.info(f"Registered skill: {skill.name}")

    def register_hook(self, event_name: str, callback: Callable[..., Any]):
        if event_name not in self.hooks:
            self.hooks[event_name] = []
        self.hooks[event_name].append(callback)
        logger.info(f"Registered hook callback for event: {event_name}")

    def trigger_event(self, event_name: str, *args, **kwargs):
        """
        Triggers an event asynchronously or synchronously, calling all registered callbacks.
        """
        if event_name in self.hooks:
            logger.info(f"Triggering event hooks for '{event_name}'")
            for callback in self.hooks[event_name]:
                try:
                    callback(*args, **kwargs)
                except Exception as e:
                    logger.error(f"Error in hook callback for '{event_name}': {e}")


# Initialize global Agent OS instance
agent_os = AgentOSRegistry()

# ----------------- Define Core Skills -----------------

def skill_openai_call(prompt: str, system: str, json_mode: bool = False) -> str:
    return call_openai(system, prompt, json_mode)

openai_skill = Skill(
    name="call_openai",
    description="Invokes the OpenAI Large Language Model (gpt-4o-mini) to perform text generation, synthesis, or extraction.",
    func=skill_openai_call
)

agent_os.register_skill(openai_skill)


# ----------------- Define Core Agents -----------------

# 1. Triage Agent
triage_system_prompt = """
You are the TriageAgent, an inbox organizer designed to scan incoming emails and categorize them by priority.
Analyze the sender, subject, and body of the email.
Determine the priority level: 'high', 'medium', or 'low'.
Provide a concise, 1-sentence explanation of why you chose that priority level.

You must respond in JSON format with the following keys:
{
  "priority": "high" | "medium" | "low",
  "reason": "Reason for priority assignment"
}
"""
triage_agent = Agent(
    name="TriageAgent",
    role="Email Triage & Inbox Sorting",
    system_prompt=triage_system_prompt
)
triage_agent.bind_skill(openai_skill)
agent_os.register_agent(triage_agent)


# 2. Summary Agent
summary_system_prompt = """
You are the SummaryAgent, an expert at digesting long emails and email threads into concise, readable summaries.
Create a bullet-point summary of the email (maximum 3 bullet points).
Identify key items, decisions, and any requested actions.

Respond in clean text or Markdown formatting. Focus on core details, avoiding preamble.
"""
summary_agent = Agent(
    name="SummaryAgent",
    role="Email Summarization & Synthesis",
    system_prompt=summary_system_prompt
)
summary_agent.bind_skill(openai_skill)
agent_os.register_agent(summary_agent)


# 3. Drafting Agent
drafting_system_prompt = """
You are the DraftingAgent, a copywriter designed to assist users in writing responses to emails.
Analyze the original email context and draft a context-aware response based on the user's instructions (prompt) and preferred tone.

Supported Tones:
- professional: Formal, polite, and business-ready.
- friendly: Warm, appreciative, and open.
- casual: Informative, direct, and conversational.
- urgent: Concise, pressing, and focused.

Avoid placeholders (like [Your Name]). If you need to sign off, use the recipient's name or 'Alex' based on details in the email.
"""
drafting_agent = Agent(
    name="DraftingAgent",
    role="Contextual Draft Generator",
    system_prompt=drafting_system_prompt
)
drafting_agent.bind_skill(openai_skill)
agent_os.register_agent(drafting_agent)


# ----------------- Event Hooks Setup -----------------

# Auto-Triage Hook
def auto_triage_on_received(email_id: str, email_data: dict):
    """
    Hook triggered when a new email is received.
    Automatically runs triage_agent to set the priority and reason.
    """
    logger.info(f"Auto-Triage Hook triggered for email {email_id}")
    email_text = f"From: {email_data.get('fromName')} <{email_data.get('fromEmail')}>\nSubject: {email_data.get('subject')}\nBody: {email_data.get('body')}"
    
    try:
        triage_json = triage_agent.run(email_text, json_mode=True)
        triage_result = json.loads(triage_json)
        
        # update SQLite database entry directly
        from api.db.database import db_instance
        priority = triage_result.get("priority", "medium")
        reason = triage_result.get("reason", "")
        db_instance.update_email_triage_by_id_only(email_id, priority, reason)
        logger.info(f"Email {email_id} successfully auto-triaged to {priority.upper()}")
    except Exception as e:
        logger.error(f"Failed to auto-triage email {email_id}: {e}")

# Register hook to on_email_received
agent_os.register_hook("on_email_received", auto_triage_on_received)
