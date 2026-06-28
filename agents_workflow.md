# AuraMail Multi-Agent AI Workflow

This document describes the Agent OS implementation in AuraMail, detailing the agents, skills, hooks, and collaborative execution flows.

## Agent OS Catalog

### 1. Agents List
- **`TriageAgent`**: Inbox analyzer. Inspects incoming email sender headers, subject line, and body to classify the message as `high`, `medium`, or `low` priority and drafts a short reasoning.
- **`SummaryAgent`**: Core reader. Distills long, complex email text and threads into 2-3 action-oriented bullet points.
- **`DraftingAgent`**: Reply co-author. Takes original email contexts, user directives, and requested tones (professional, friendly, casual, urgent) to write response templates.

### 2. Skills Registry
- **`call_openai`**: Integrates the OpenAI Python SDK to query **GPT-4o-mini** models. Manages system instructions, json configurations, and implements simulated local fallbacks.

### 3. Hooks & Event Bindings
- **`on_email_received`**: Activates automatically whenever a new email record is synchronized. Fires the `TriageAgent` to classify priority before the user even opens the inbox.

---

## AI-First Collaborative Workflows

AuraMail functions as a cooperative Agent OS where multiple agents work in sequence to triage, synthesize, and compose responses.

```
       [New Email Received]
                 │
                 ▼ (Hook: on_email_received)
         [TriageAgent]
                 │
                 ├─► Assigns Priority (High/Med/Low)
                 └─► Writes Explanatory Reason
                 │
                 ▼ (User Selects Email)
         [SummaryAgent]
                 │
                 └─► Synthesizes core actions/bullets
                 │
                 ▼ (User Clicks Preset or Inputs Prompt)
        [DraftingAgent]
                 │
                 └─► Composes context-aware response
```

### Step 1: Automated Triaging & Triage Explanations
When an email is received (or manually triaged), the `TriageAgent` is executed. Rather than a simple keyword filter, it utilizes OpenAI to understand the semantic context. For example, it distinguishes between a critical production warning (CPU > 95%) and a campus facility elevators schedule, assigning the proper tags and providing a 1-sentence logic statement (e.g. *"Q3 budget allocation at risk if roadmap slides are delayed"*).

### Step 2: On-Demand Summarization
When the user clicks the **"AI Summary"** tab on a message, the `SummaryAgent` takes over. It reads the raw contents and filters out unnecessary email boilerplate (like signatures, disclaimers, or generic sign-offs). It returns a clean bulleted breakdown of actionable next steps.

### Step 3: Context-Aware Reply Drafting
If the user chooses to reply, they can select a preset instruction (e.g., *"Decline Invitation"*) or input custom details (e.g. *"tell David I will upload the link tonight"*). The `DraftingAgent` reads the original email body, extracts the names of sender and recipient, reviews the user's goals, and formats a complete response matching the requested tone (e.g., formal professional or warm friendly). The output is piped directly into the compose modal, enabling the user to send the response immediately.
