# AuraMail Developer Playbook (GEMINI.md)

This document contains CLI shortcuts, testing protocols, styling guides, and code patterns for AuraMail.

## Build and Run Scripts

### Local Development (Concurrent)
Starts both the Next.js dev server (port 3000) and the FastAPI backend (port 8000) concurrently.
```bash
npm run dev:full
```

### Run Frontend Only
Runs the Next.js App Router server locally.
```bash
npm run dev
```

### Run Backend Only
Starts the Python Uvicorn server on port 8000.
```bash
npm run dev:backend
```

### Run with Docker Compose
Launches both services inside containers (Next.js on port 3000, FastAPI on port 8000) using a shared bridge network.
```bash
docker-compose up --build
```
Or with your OpenAI API key loaded (PowerShell):
```bash
$env:OPENAI_API_KEY="your_key_here"; docker-compose up --build
```

## Testing Commands

### Run Backend Unit Tests (Pytest)
Executes all API routing, data simulation, and Agent OS mock/logic tests. Set the `PYTHONPATH` context before running.
```bash
# Windows PowerShell
$env:PYTHONPATH="."
.\.venv\Scripts\pytest.exe

# macOS/Linux Bash
PYTHONPATH=. .venv/bin/pytest
```

### Run Frontend Integration Tests (Vitest)
Executes the React store context triggers and component state mock tests.
```bash
npm run test
```

## Styling & Theme Rules
- **Tailwind CSS v4**: All UI code is written using Tailwind CSS v4 utility classes.
- **Theme Variables**: Configured inside [src/app/globals.css](file:///d:/Ank/atg/email-client/src/app/globals.css) using `@theme` syntax. Do not declare custom styles or components inside separate configuration files.
- **Glassmorphism**: Render custom blurred components using the `.glass-card` class defined globally.
- **Typography**: The primary typography is **Outfit** for headers/branding, and **Inter** for readable paragraphs/email lists.

## Agent OS System
- All agents (`TriageAgent`, `SummaryAgent`, `DraftingAgent`) inherit from the base `Agent` container in [api/agents/agent_os.py](file:///d:/Ank/atg/email-client/api/agents/agent_os.py).
- Bind all agent tool calls to the central `call_openai` skill.
- Maintain fallback simulation models inside [api/ai/openai_service.py](file:///d:/Ank/atg/email-client/api/ai/openai_service.py) to guarantee the codebase builds and executes successfully even when an `OPENAI_API_KEY` is not loaded.
