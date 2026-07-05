# AuraMail Production Readiness Audit & Architectural Review
**Author**: Senior Systems Architect / Developer  
**Status**: Recommendation & Migration Plan

This audit reviews the current architecture of **AuraMail** and outlines the security, scalability, and performance changes required to transition the project from a local development prototype to a secure, highly scalable, production PWA.

---

## 1. High-Level Architectural Trade-offs: Dev vs. Production

The current developer setup runs Next.js and FastAPI concurrently or package-bundled in a single Docker Compose network. While excellent for local testing, this requires structural decoupling for production.

| Component | Local Development (Current) | Production Architecture (Recommended) |
| :--- | :--- | :--- |
| **Frontend Hosting** | Next.js Dev Server (Node.js) or Static Export | Vercel, AWS Amplify, or Netlify (enables SSR, Middleware, Edge Functions) |
| **Backend API** | FastAPI running via Uvicorn locally on port 8000 | AWS ECS Fargate, Google Cloud Run, or Kubernetes (EKS) behind an ALB |
| **Database** | Ephemeral/Local SQLite database (`auramail.db`) | PostgreSQL (AWS RDS or Supabase) with pgBouncer for connection pooling |
| **Mail Syncing** | Synchronous IMAP connections in HTTP Request Thread | Asynchronous worker queues (Celery, RQ, or AWS SQS) backed by Redis |
| **Secret Storage** | Plaintext `.env` files (auto-generated keys) | AWS Secrets Manager, Vercel Environment Secrets, or HashiCorp Vault |

---

## 2. Deep-Dive Audit Findings & Recommended Solutions

### 🎯 Finding A: SQLite Ephemerality & Concurrency Limits
*   **The Issue**: The current SQLite database resides in `/tmp/auramail.db` on serverless (Vercel) or a local file in Docker. In serverless deployments, this database is **ephemeral** and gets wiped out whenever Vercel recycles container instances. SQLite also has poor support for concurrent writes, which will block when background syncing tasks scale up.
*   **Production Solution**: Migrate to a managed **PostgreSQL** instance (such as AWS RDS PostgreSQL or Supabase).
    *   Setup **pgBouncer** as a connection pooler to prevent FastAPI serverless instances from exhausting DB connections.
    *   Implement **SQLAlchemy** or **SQLModel** ORM configurations in the backend to abstract database connections (replacing manual `sqlite3` cursors).
    *   Use **Alembic** to manage database schema updates and migrations securely in production CI/CD pipelines.

### 🎯 Finding B: Synchronous IMAP Syncing (HTTP Timeout Risk)
*   **The Issue**: Email synchronization (`POST /api/emails/{account_id}/sync`) is currently triggered directly in the HTTP request-response cycle. Syncing a large mailbox over IMAP takes time. Vercel serverless has a hard request execution timeout (10s on free, 30s on pro). Synchronous sync blocks the worker threads, slowing down other API requests.
*   **Production Solution**: Decouple syncing from the HTTP request thread.
    1.  **Introduce a Task Queue**: Install **Celery** or **RQ** with **Redis** as a message broker.
    2.  **Asynchronous Sync Flow**:
        *   The frontend triggers a sync.
        *   FastAPI backend starts a Celery background task (`sync_mailbox.delay(account_id)`) and instantly returns a `202 Accepted` with a task ID.
        *   The frontend displays a "Syncing..." spinner and listens for completion.
    3.  **Real-Time Updates**: Use **FastAPI WebSockets** or **Server-Sent Events (SSE)** to push sync progress, CPU alerts, or new email notifications directly to the frontend.

### 🎯 Finding C: Secret Key Security & Credential Rotation
*   **The Issue**: Currently, the `ENCRYPTION_KEY` used to encrypt/decrypt IMAP App Passwords and the `JWT_SECRET` are stored in `.env` files. If the server crashes and regenerates the `ENCRYPTION_KEY`, all previously encrypted credentials in the database become unreadable (bricked).
*   **Production Solution**:
    *   **Secrets Manager**: Migrate `ENCRYPTION_KEY`, `JWT_SECRET`, and `OPENAI_API_KEY` to **AWS Secrets Manager**, Vercel Secrets, or HashiCorp Vault.
    *   **Key Rotation**: Implement a credential rotation protocol. If the encryption key is rotated, write a migration script that decrypts all database records with the old key and re-encrypts them with the new key.
    *   **Database Isolation**: Place the PostgreSQL RDS instance inside a private subnet in a VPC, accessible only by the ECS container security groups.

### 🎯 Finding D: HTML Email Rendering CSS Injection & Tracking Pixels
*   **The Issue**: Rendering email HTML inside a sandboxed `iframe` blocks JavaScript, which is secure. However, raw email HTML can still load external resources (e.g. `<img src="http://tracker.com/pixel.png">` or external stylesheets). This leaks user privacy (location, IP, email open tracking) and exposes CSS injection vulnerabilities.
*   **Production Solution**: Implement a backend sanitization pipeline before writing HTML content to the database:
    *   Use Python's **Bleach** or **lxml.html.clean** library in [emails.py](../api/routes/emails.py) to parse the parsed mail bodies:
        ```python
        import bleach
        
        # Whitelist only safe formatting tags and attributes
        allowed_tags = ['p', 'span', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'a', 'br', 'table', 'tr', 'td', 'div']
        allowed_attrs = {'a': ['href', 'target'], '*': ['style']}
        
        clean_html = bleach.clean(raw_html, tags=allowed_tags, attributes=allowed_attrs, strip=True)
        ```
    *   Replace all external images with a placeholder, letting users click "Load external images" before resolving them in the frontend (matching standard email client security).

### 🎯 Finding E: OpenAI Cost Control & Rate Limiting
*   **The Issue**: AuraMail automatically runs `TriageAgent` on the `on_email_received` hook for every new email during synchronization. A sudden flood of incoming mail will hit OpenAI API rate limits (TPM/RPM) and result in high token costs.
*   **Production Solution**:
    *   **Redis Response Caching**: Hash the email body and subject. Before calling `gpt-4o-mini`, check if the hash exists in Redis cache to avoid redundant API charges.
    *   **Prompt Compression**: Programmatically strip generic email signatures, disclaimers, and verbose HTML headers prior to calling the LLM.
    *   **Fallback local models**: Implement rule-based heuristics or a lightweight local model (e.g., small Hugging Face classifier) to filter out obvious newsletters or junk mail *before* hitting the OpenAI API, reducing costs by 60%+.

---

## 3. Production Deployment Blueprint

```
                      [ Client PWA Browser ]
                                │
             ┌──────────────────┴──────────────────┐
             ▼ (Static Webpages / Next.js SSR)      ▼ (REST API / WebSockets)
     [ CDN / Vercel Edge ]                [ Application Load Balancer ]
             │                                     │
             │                                     ▼ (Private VPC)
             │                             [ AWS ECS Fargate FastAPI ]
             │                                     │
             │                     ┌───────────────┴───────────────┐
             │                     ▼                               ▼
             │               [ Redis Broker ]              [ AWS RDS PostgreSQL ]
             │                     │                               ▲
             │                     ▼                               │
             │             [ Celery Sync Workers ] ────────────────┘
             │
             ▼
     [ AWS Secrets Manager ] (Loads JWT / Fernet Keys at runtime)
```

---

## 4. Production Readiness Checklist

- [ ] **Infrastructure**
  - [ ] Provision AWS Fargate container instances.
  - [ ] Set up RDS PostgreSQL with pgBouncer.
  - [ ] Configure ALB with SSL certificates.
- [ ] **Security**
  - [ ] Move environment secrets to AWS Secrets Manager.
  - [ ] Integrate Bleach HTML sanitization pipeline on backend mail parser.
  - [ ] Disable `allow-scripts` on iframe sandbox container inside React frontend.
- [ ] **Scale & Background Processing**
  - [ ] Install Celery + Redis for asynchronous IMAP sync tasks.
  - [ ] Add Redis cache check prior to calling OpenAI API endpoints.
  - [ ] Implement local spam/newsletter filter to prevent redundant triage API calls.
- [ ] **Observability**
  - [ ] Configure Sentry SDK on both Next.js and FastAPI.
  - [ ] Expose Prometheus metrics endpoint (`/metrics`) on API server for CPU, memory, and token consumption tracking.
