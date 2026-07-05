# AuraMail: AI-First Universal Email Client (Next.js & Python FastAPI)

AuraMail is a premium, mobile-ready Progressive Web App (PWA) designed to serve as an AI-first universal email client. It provides a unified inbox for Gmail, Office 365, and IMAP accounts, enhanced by Gemini AI for smart summaries, prioritized sorting, and context-aware draft generation. The application is built using a hybrid stack: a **Next.js** frontend styled with **Tailwind CSS v4**, and a **Python FastAPI** backend deployed as Vercel serverless functions.

## User Review Required

> [!IMPORTANT]
> **Python Environment Requirements**
> Running this project locally requires a local Python 3.9+ installation. In local development:
> 1. The FastAPI backend will run on `http://127.0.0.1:8000`.
> 2. Next.js will run on `http://localhost:3000` and proxy `/api/*` requests to the FastAPI server using rewrites.
> 3. Dependencies are managed via `requirements.txt` (Python) and `package.json` (JavaScript).
> Please review and verify this setup matches your local developer environment.

> [!TIP]
> **Out-of-the-Box Swagger Documentation**
> By using FastAPI, you will automatically get visual, interactive API documentation (Swagger UI) at `/api/docs` or `/api/redoc` during development.

---

## Phase-by-Phase Implementation Plan

We will execute the project in six distinct phases to ensure thorough development, rigorous specs-driven testing, and seamless integration.

### Phase 1: Environment & Project Setup
*   **Step 1.1**: Initialize the Python environment. Create a virtual environment (`.venv`), activate it, and install dependencies from `requirements.txt`.
*   **Step 1.2**: Set up the Next.js project. We will initialize Next.js in the root directory in non-interactive mode.
*   **Step 1.3**: Configure Tailwind CSS v4 in the project. Create `postcss.config.mjs`, import Tailwind into `src/app/globals.css`, and set up baseline theme styles.
*   **Step 1.4**: Establish the local dev configuration. Write `next.config.mjs` with rewrite rules pointing `/api/:path*` to `http://127.0.0.1:8000/api/:path*`.
*   **Step 1.5**: Set up the Vitest and Pytest environments.

### Phase 2: FastAPI Core & Data Simulation
*   **Step 2.1**: Implement `api/index.py`. Set up FastAPI, CORS headers, and basic `/api/health` checking routes.
*   **Step 2.2**: Define Pydantic models in `api/models.py` (Email, Account, Label, Draft, Summary, Triage).
*   **Step 2.3**: Create mock datasets in `api/db/mock_data.py`. We will populate it with 15+ highly realistic emails representing Gmail, Office 365, and IMAP accounts across multiple folders.
*   **Step 2.4**: Implement email API routers in `api/routes/emails.py`. Support listing emails, unified feed aggregation, switching accounts, and database CRUD (Archive, Delete, Mark Read).

### Phase 3: AI Engine & Agent OS (Python)
*   **Step 3.1**: Create `api/ai/gemini.py`. Write standard Google Generative AI configurations using `google-generativeai`. Implement robust mock fallbacks if `GEMINI_API_KEY` is not present, returns realistic mock summaries and triage results.
*   **Step 3.2**: Create Agent OS framework in `api/agents/agent_os.py`. Establish class schemas for `Agent` and registry tools.
*   **Step 3.3**: Implement the agents:
    *   `TriageAgent`: Grades importance (High, Medium, Low) and writes a "priority reason" (e.g. "Sent directly to you requesting a meeting").
    *   `SummaryAgent`: Compiles core threads into concise bullet lists.
    *   `DraftingAgent`: Generates replies matching user tones.
*   **Step 3.4**: Implement AI API endpoints in `api/routes/ai.py` linking these agents to REST routes.

### Phase 4: Core State & App Layout (PWA Setup)
*   **Step 4.1**: Set up state context in `src/lib/store/store.ts` for React components. Create state handlers for active accounts, folders, search, selected email, and loading indicators.
*   **Step 4.2**: Design responsive desktop/mobile base layouts.
*   **Step 4.3**: Build the PWA specifications. Create `public/manifest.json` and a lightweight client caching script `public/sw.js` for offline asset management.
*   **Step 4.4**: Build the `Sidebar` component. Integrate the account switcher, folders navigation, and a glowing, amber toggle switch to filter on "Priority Focus" emails only.

### Phase 5: Tailwind CSS v4 Interactive UI Components
*   **Step 5.1**: Build `EmailList.tsx` showing unified feed items. Display sender, subject, relative time, priority badge, and a one-line AI summary preview. Enable mobile swipe gestures.
*   **Step 5.2**: Build `EmailDetail.tsx` reading pane. Create an glassmorphic card for the AI Bulleted Summary, action buttons (Reply, Reply All, Forward, Archive, Delete), and a Smart Reply panel.
*   **Step 5.3**: Build `ComposeModal.tsx` containing draft inputs. Integrate it with the DraftingAgent so users can generate responses via prompt or preset tones.
*   **Step 5.4**: Polish visual appearance: add smooth hover animations, custom fonts (Outfit & Inter), scrollbars, and celebrate inbox-zero with canvas-confetti.

### Phase 6: Testing, Polish & Documentation
*   **Step 6.1**: Write Python automated tests (`api/tests/`) for routing and agent triage logic. Run tests with `pytest`.
*   **Step 6.2**: Write Vitest unit/integration tests for React states, folder changes, and UI component actions.
*   **Step 6.3**: Create documentation files:
    *   `GEMINI.md`: Development playbook, CLI commands, scripts.
    *   `architecture.md`: One-page architectural breakdown.
    *   `agents_workflow.md`: Narrative of Agent OS structures, skills, and hooks.
*   **Step 6.4**: Verify local installation, build optimization, and prepare for Vercel deployment.

### Phase 7: Persistent User Management & HTML Email Rendering
*   **Step 7.1**: Integrate PyJWT and bcrypt to hash user passwords and sign secure bearer authorization tokens.
*   **Step 7.2**: Create the SQLite database layer at [api/db/database.py](../api/db/database.py) with automated migration checks.
*   **Step 7.3**: Create user auth router at [api/routes/auth.py](../api/routes/auth.py) and secure all endpoints.
*   **Step 7.4**: Implement a sandboxed secure `iframe` inside `EmailDetail.tsx` to safely render rich HTML emails.

### Phase 8: Active Tab Delta Polling
*   **Step 8.1**: Optimize the IMAP synchronization loop to terminate search traversals immediately when duplicate email records are detected in the database.
*   **Step 8.2**: Implement a visibility-aware React sync hook inside `page.tsx` that triggers delta polls every 2 minutes only if the browser tab is focused.
*   **Step 8.3**: Enable manual sync button operations across all folder views and accounts.

### Phase 9: Gmail-Inspired Body Rendering & Switchers
*   **Step 9.1**: Unify both plain text and rich HTML email renders inside a clean paper-white card.
*   **Step 9.2**: Add format switchers (`[ HTML ]` / `[ Text ]`) for message bodies containing both representations.

### Phase 10: Custom IMAP Host & Port Configurations
*   **Step 10.1**: Add IMAP Host and Port setting input text fields inside the connection modal.
*   **Step 10.2**: Update the backend account routers and schemas to accept, save, and utilize custom IMAP configurations.

### Phase 11: Local SSL Bypass & Render Loop Stability
*   **Step 11.1**: Bypass local system Python SSL handshake verification blocks to prevent certificate errors.
*   **Step 11.2**: Memoize key email state synchronization functions inside `store.tsx` to eliminate infinite rendering loops.

---

## Proposed Changes

Below are files created or modified inside `d:\Ank\atg\email-client`.

### Backend Components

#### [NEW] [requirements.txt](../requirements.txt)
#### [NEW] [api/index.py](../api/index.py)
#### [NEW] [api/models.py](../api/models.py)
#### [NEW] [api/auth.py](../api/auth.py)
#### [NEW] [api/db/database.py](../api/db/database.py)
#### [NEW] [api/routes/auth.py](../api/routes/auth.py)
#### [NEW] [api/routes/emails.py](../api/routes/emails.py)
#### [NEW] [api/routes/ai.py](../api/routes/ai.py)
#### [NEW] [api/ai/openai_service.py](../api/ai/openai_service.py)
#### [NEW] [api/agents/agent_os.py](../api/agents/agent_os.py)
#### [NEW] [api/tests/test_backend.py](../api/tests/test_backend.py)

### Frontend Components

#### [NEW] [package.json](../package.json)
#### [NEW] [next.config.ts](../next.config.ts)
#### [NEW] [src/app/globals.css](../src/app/globals.css)
#### [NEW] [src/app/layout.tsx](../src/app/layout.tsx)
#### [NEW] [src/app/page.tsx](../src/app/page.tsx)
#### [NEW] [src/lib/store/store.tsx](../src/lib/store/store.tsx)
#### [NEW] [src/components/AuthScreen.tsx](../src/components/AuthScreen.tsx)
#### [NEW] [src/components/Sidebar.tsx](../src/components/Sidebar.tsx)
#### [NEW] [src/components/EmailList.tsx](../src/components/EmailList.tsx)
#### [NEW] [src/components/EmailDetail.tsx](../src/components/EmailDetail.tsx)
#### [NEW] [src/components/ComposeModal.tsx](../src/components/ComposeModal.tsx)
#### [NEW] [src/components/AddAccountModal.tsx](../src/components/AddAccountModal.tsx)
#### [NEW] [public/manifest.json](../public/manifest.json)
#### [NEW] [public/sw.js](../public/sw.js)

### Project Documentation

#### [NEW] [GEMINI.md](GEMINI.md)
#### [NEW] [architecture.md](architecture.md)
#### [NEW] [agents_workflow.md](agents_workflow.md)
#### [NEW] [walkthrough.md](walkthrough.md)
#### [NEW] [task.md](task.md)

---

## Verification Plan

### Automated Tests
*   **Backend Testing**:
    *   Command: `pytest`
*   **Frontend Testing**:
    *   Command: `npm run test`

### Manual Verification
*   Verify interactive API documentation loads at `http://127.0.0.1:8000/docs`.
*   Ensure full responsive scaling down to 360px width.
*   Confirm folder interactions (Delete/Archive) visually reflect in state immediately.
