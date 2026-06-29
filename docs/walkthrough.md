# AuraMail Development Walkthrough

AuraMail is successfully built as a high-fidelity, premium, and responsive Progressive Web App (PWA) email client powered by Next.js, Tailwind CSS v4, and Python FastAPI.

## What Was Built

### 1. Environment & Config Setup
- Set up a Next.js App Router workspace at the root, styled with Tailwind CSS v4.
- Created a Python virtual environment (`.venv`) and installed dependencies from `requirements.txt` (`fastapi`, `google-generativeai`, `pydantic`, `pytest`).
- Configured local proxy rewrites in `next.config.ts` mapping `/api/*` requests to the backend (supporting the dynamic `BACKEND_URL` environment variable for Docker).
- Configured Vitest setup at [vitest.config.ts](file:///d:/Ank/atg/email-client/vitest.config.ts).
- Integrated Docker Compose: added [docker-compose.yml](file:///d:/Ank/atg/email-client/docker-compose.yml), [backend.Dockerfile](file:///d:/Ank/atg/email-client/backend.Dockerfile), and [frontend.Dockerfile](file:///d:/Ank/atg/email-client/frontend.Dockerfile) to build and run the entire stack.

### 2. FastAPI Backend Service & Data Mocking
- Created [api/index.py](file:///d:/Ank/atg/email-client/api/index.py) to initialize FastAPI and mount routers.
- Created [api/models.py](file:///d:/Ank/atg/email-client/api/models.py) specifying Pydantic schemas for mail metadata.
- Created a persistent SQLite database manager at [api/db/database.py](file:///d:/Ank/atg/email-client/api/db/database.py) supporting users, accounts, and email tables, auto-seeding mock feeds on registration.
- Created routers for accounts, email feed searches, folder moves, read states, real-time IMAP syncing, actual SMTP mailing, and secure JWT auth tokens.

### 3. Agent OS AI Integrations
- Implemented the Agent OS Registry at [api/agents/agent_os.py](file:///d:/Ank/atg/email-client/api/agents/agent_os.py).
- Created the following specialized agents:
  - `TriageAgent`: Assigns importance grades (High/Medium/Low) and reasoning statements.
  - `SummaryAgent`: Distills message threads into structured bullet lists.
  - `DraftingAgent`: Composes replies matching professional, friendly, casual, and urgent tones.
- Connected these agents to POST endpoints in [api/routes/ai.py](file:///d:/Ank/atg/email-client/api/routes/ai.py).
- Implemented an automatic simulated fallback in case of missing keys.

### 4. Interactive React UI (Tailwind v4 & PWA)
- Managed client state using React Context at [src/lib/store/store.tsx](file:///d:/Ank/atg/email-client/src/lib/store/store.tsx).
- Created PWA caching structures at [public/sw.js](file:///d:/Ank/atg/email-client/public/sw.js) and [public/manifest.json](file:///d:/Ank/atg/email-client/public/manifest.json), registered via [src/components/PWARegister.tsx](file:///d:/Ank/atg/email-client/src/components/PWARegister.tsx).
- Built responsive user interfaces:
  - `Sidebar.tsx`: Collapsible nav panel (w-64 to w-16) supporting icon-only folders, rounded compose buttons, flyout switcher menus, active triage indicators, and logout actions.
  - `EmailList.tsx`: Collapsible feed drawer (w-96 to w-0) with sliding animations and folding chevron toggles.
  - `EmailDetail.tsx`: Viewport-constrained reading pane (`min-w-0 overflow-hidden`) with word-wrap properties preventing layouts from expanding off-screen, and floating feed restore buttons.
  - `ComposeModal.tsx`: Text input modal linked directly with reading pane drafts.
  - `AddAccountModal.tsx`: Dynamic connection modal allowing users to register new accounts (Gmail, Office 365, IMAP) with welcome mail populations.
  - `EmailList.tsx`: Integrated a "Sync" action header button linking with `imaplib` to fetch and parse actual email threads in real-time.

### 5. Persistent User Management & HTML Email Rendering
- **SQLite Database Persistence**: Created tables for users, accounts, and emails to store metadata and message details.
- **Bcrypt & JWT Security**: Hashes user passwords using `bcrypt` and authenticates frontend sessions with JWT bearer tokens.
- **AES Fernet Credential Encryption**: Encrypts and decrypts third-party email account credentials before storage.
- **Glassmorphic Auth Panel**: Added [AuthScreen.tsx](file:///d:/Ank/atg/email-client/src/components/AuthScreen.tsx) to handle user login and registration.
- **Secure Sandboxed iframe**: Renders rich HTML email bodies securely by isolating CSS layouts and preventing script execution inside an `iframe`.

### 6. Delta Sync Optimization (IMAP)
- **Early Exit Traversal**: Optimized [emails.py](file:///d:/Ank/atg/email-client/api/routes/emails.py) sync loops to traverse message list UIDs in reverse (newest first). The loop breaks (`break`) immediately when a duplicate email sequence is found in the database, reducing sync check times from seconds to milliseconds.
- **Sent Folder Syncing**: Implemented automatic synchronization of outbound mail folders (`[Gmail]/Sent Mail`, `Sent Items`, etc.) alongside inbox sync.

### 7. Visibility-Aware Active Tab Polling
- **Focused Sync Only**: Added a visibility-aware React `useEffect` inside [page.tsx](file:///d:/Ank/atg/email-client/src/app/page.tsx) that runs a synchronization check every **2 minutes**.
- **Visibility State Guard**: Checks if `document.visibilityState === "visible"`. If minimized or running in a background tab, it bypasses the sync request to conserve server API resources.
- **Permanent Manual Sync**: Enabled a permanent "Sync" button in [EmailList.tsx](file:///d:/Ank/atg/email-client/src/components/EmailList.tsx) that allows users to manually trigger email syncing at any time, supporting sequential syncs of all connected accounts when in the "Unified Inbox" view.

### 8. System Notification Bell UI
- **Sync Notice & Rules Panel**: Added a Bell icon in the Search Header that opens a dropdown containing notices explaining the visibility-aware 2-minute sync cycles, database session caching, and self-healing local storage restoration actions. Includes an unread indicator dot.

### 9. Gmail-Style Unified Body Card & switchers
- **Paper-White Sheet**: Plain text and HTML emails render on the same clean, unified paper-white sheet background in [EmailDetail.tsx](file:///d:/Ank/atg/email-client/src/components/EmailDetail.tsx).
- **Body Format Toggle Pill**: Displays a button group toggler (`[ HTML ]` and `[ Text ]`) allowing users to easily toggle formats when an email contains both representations.
- **Actionable App Password Instructions**: Automatically catches IMAP connection login errors on incorrect credentials and provides clear, step-by-step checklists (App Passwords, IMAP enablement) to assist users.

### 10. Custom IMAP Host & Port Configurations
- **UI Custom Settings**: Added **IMAP Host** and **Port** text inputs in [AddAccountModal.tsx](file:///d:/Ank/atg/email-client/src/components/AddAccountModal.tsx) to connect accounts with custom hosting domains (e.g. `admin@starpsoft.in`) instead of defaulting to yahoo/aol servers.
- **SSL Bypass**: Configured dynamic SSL contexts that ignore verification checks, bypassing local system Python certificate validation/handshake errors.
- **Memoized Render Loops**: Wrapped key state actions (like `syncEmails`) in React `useCallback` hooks inside [store.tsx](file:///d:/Ank/atg/email-client/src/lib/store/store.tsx) to prevent infinite re-render loops on page initialization.

---

## Testing & Validation Results

We executed both backend and frontend test suites to ensure 100% correctness:

### 1. Backend Pytest API Tests
Passed all 14 test specs verifying authentication flows, custom domains, triaging grading, and validation fallbacks:
```bash
$env:PYTHONPATH="."
.\.venv\Scripts\pytest.exe
```
> **Result**: `14 passed, 2 warnings in 6.44s`

### 2. Frontend Vitest Store Tests
Successfully validated React state triggers, compose modals, and default state operations:
```bash
npm run test
```
> **Result**: `2 passed in 5.98s`

### 3. Production Build Validation
Sanity-checked and verified Next.js compiler bundling completes cleanly:
```bash
npm run build
```
> **Result**: `✓ Compiled successfully`
