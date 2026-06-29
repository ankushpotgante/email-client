# AuraMail — AI-First Universal Email Client

AuraMail is a modern, AI-first universal email client built with **Next.js (App Router, Tailwind CSS v4)** on the frontend and **FastAPI (Python, SQLite)** on the backend. It features AI-powered thread summarization, smart dynamic replies, automatic triage (priority focus sorting), and persistent IMAP synchronization.

---

## 🚀 How to Run the Application

You can run AuraMail in three different ways: using the **Concurrent Dev Server** (recommended for frontend/backend development), the **Unified FastAPI Server** (compiles the frontend and serves everything on a single port), or **Docker Compose**.

### Prerequisite: Environment Setup
1. Copy the example environment file to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your values (e.g., your `OPENAI_API_KEY` for AI features, `JWT_SECRET`, and optional encryption configurations).

### 💾 Database Setup & Seeding (Automatic)
The SQLite database (`auramail.db`) is **automatically created and seeded** when you start the FastAPI backend. 
*   On first startup, the database file is initialized, tables are migrated, and a default user (`dummy` with password `dummy`) is created.
*   This user is pre-populated with seeded demo emails and accounts (Gmail, Outlook, IMAP) for immediate testing.
*   No manual SQL command execution or database migration steps are required.

---

### Option 1: Local Development (Concurrent Mode)
This runs both the Next.js development server (port 3000) and the FastAPI backend server (port 8000) concurrently with active hot-reloading.

#### 1. Setup Backend
Open a terminal in the project directory:
```bash
# Create a Python virtual environment
python -m venv .venv

# Activate the virtual environment
# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### 2. Setup Frontend
In another terminal (or before starting the backend), install the Node dependencies:
```bash
npm install
```

#### 3. Start the Application
Run the concurrent launch command:
```bash
npm run dev:full
```
*   **Frontend**: accessible at [http://localhost:3000](http://localhost:3000)
*   **FastAPI Backend & API Docs**: accessible at [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

---

### Option 2: Unified FastAPI Serving (Single Port 8000)
This mode compiles the Next.js app to a static production export (`out/` directory) and configures FastAPI to serve both the API and the static web page. Running just the FastAPI server on port 8000 serves the entire application.

1. Build the Next.js static production bundle:
   ```bash
   npm run build
   ```
2. Start the FastAPI backend:
   ```bash
   # Windows
   $env:PYTHONPATH="."
   .\.venv\Scripts\python.exe -m uvicorn api.index:app --reload --port 8000
   
   # macOS/Linux
   PYTHONPATH=. .venv/bin/python -m uvicorn api.index:app --reload --port 8000
   ```
3. Open [http://localhost:8000](http://localhost:8000) in your browser. The entire application is hosted on port 8000.

---

### Option 3: Running with Docker Compose
If you have Docker installed, you can build and run both services concurrently inside isolated containers:

```bash
docker-compose up --build
```
*   **Frontend**: accessible at [http://localhost:3000](http://localhost:3000)
*   **Backend**: accessible at [http://localhost:8000](http://localhost:8000)

---

## 🧪 Testing Protocol

### Run Backend Unit Tests (Pytest)
To execute all backend test cases (API routes, email parsing, database models, and AI service fallbacks):

```bash
# Windows
$env:PYTHONPATH="."
.\.venv\Scripts\pytest.exe

# macOS/Linux
PYTHONPATH=. .venv/bin/pytest
```

### Run Frontend Integration Tests (Vitest)
To run frontend React component and store state tests:

```bash
npm run test
```

---

## 🔄 Active Tab Delta Polling Strategy

To ensure optimal performance and resource efficiency when deployed in serverless/cloud environments, AuraMail uses an **Active Tab Delta Polling** mechanism:

1. **Client-Side Visibility Gate**: The React application runs a periodic background check every **2 minutes**. It leverages the browser's Page Visibility API (`document.visibilityState === 'visible'`). If the user switches tabs or minimizes the window, the synchronization stops immediately, saving database and server resources.
2. **Server-Side Early Break**: In the IMAP synchronization loop, emails are fetched from newest to oldest. As soon as the backend detects an email that already exists in the database, it instantly stops processing (`break`). This ensures subsequent checks take milliseconds instead of seconds, running minimal network and SQLite overhead.

---

## 🔒 Security & Cryptography

*   **User Authentication**: Passwords are securely hashed using `bcrypt` during registration. Session paths are guarded using JWT Bearer authentication tokens.
*   **Credential Protection**: Third-party email passwords and App Passwords are encrypted using AES-256 symmetric ciphers (`cryptography.fernet`) before being saved in SQLite.
*   **Sandbox Security**: Incoming email bodies are parsed and loaded inside a secure sandboxed `iframe` in the React frontend, isolating layouts and blocking cross-site script execution (XSS).
*   **Local SSL Handshake**: Outgoing server requests configure an SSL context bypass to enable local development environments to query IMAP services (port 993) regardless of local machine certificate store version issues.

---

## 🌐 Custom IMAP Domains & PWA

*   **Custom Hosting**: Supports custom hosted domains (e.g., `user@company.com`) by letting you define your explicit **IMAP Host** and **Port** inside the Add Account modal.
*   **PWA Offline Capabilities**: Configured with a Service Worker (`sw.js`) and PWA web app manifest (`manifest.json`) enabling offline launch and layout shell caching.

---

## 📖 Developer Documentation & Playbooks

For deeper architectural analysis and command instructions, check the files inside the [docs](docs/) folder:
*   [walkthrough.md](docs/walkthrough.md): Comprehensive phase-by-phase feature development narratives.
*   [architecture.md](docs/architecture.md): Visual diagrams and layout flow of components.
*   [agents_workflow.md](docs/agents_workflow.md): AI Agent OS specifications, skills registries, and hook details.
*   [GEMINI.md](docs/GEMINI.md): Playbook for CLI shortcuts, testing setups, and Tailwind v4 theme guidelines.
*   [task.md](docs/task.md): Project checklist and completed task lists.
