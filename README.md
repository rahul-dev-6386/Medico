# Sanjeevni AI — AI-Powered Medication Information Platform

A full-stack medical information platform that lets users search for drug information through a hybrid retrieval system: a local structured database (PostgreSQL) for verified results, with an AI-powered fallback using Retrieval-Augmented Generation (RAG) over a Qdrant vector store.

## Architecture

```
User → Next.js Frontend → FastAPI Backend → PostgreSQL (local search)
                                          → Qdrant + LLM (AI fallback)
```

- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, Framer Motion
- **Backend:** Python FastAPI with modular service layer
- **Database:** Supabase PostgreSQL with SQLAlchemy ORM and Alembic migrations
- **Vector Store:** Qdrant for semantic drug information retrieval
- **AI:** Google Gemini API for RAG-powered answer generation
- **Auth:** JWT dual-token auth (access + refresh) with silent auto-refresh

## Key Features

### Hybrid Drug Search
- **Local DB search** — Full-text PostgreSQL search returns structured drug data (generic/brand name, drug class, RxNorm ID, interactions)
- **AI fallback (RAG)** — When no local match found, semantically retrieves relevant medical chunks from Qdrant and generates grounded answers via LLM — reducing hallucination risk
- **8-phase state machine** — `idle → local_loading → local_results → no_match → ai_loading → ai_result → ai_error → answer_view` with dedicated UI for every state

### Intelligent Autocomplete
- Debounced (200ms) API calls with client-side title-casing, manufacturer detection, deduplication by generic/brand name, substring relevance ranking, and 5-item cap

### Structured Drug Answer Rendering
- Custom `react-markdown` renderer with:
  - **12 section-specific icon badges** — Info (Overview), Timer (Dosage), AlertTriangle (Side Effects), Brain (Mechanism), etc.
  - **Green checkmark bullet lists** — All list items rendered with emerald CheckCircle icons
  - **Zebra-striped tables** — sticky headers, right-aligned last column
  - **Contextual source badges** — "AI Generated" (teal) / "Verified Database" (emerald)

### Security
- **JWT dual-token auth** — Short-lived access tokens + refresh tokens with rotation
- **Silent auto-refresh** — Singleton refresh interceptor with mutex prevents concurrent refresh storms; original requests transparently retried after refresh
- **In-memory token cache** — Minimizes cookie reads via `window.__auth_tokens`
- **Rate limiting** — Per-endpoint rate limits with configurable thresholds
- **HTTP-only cookies** — `SameSite=Lax` for CSRF protection

### Drug Information Sources
- DailyMed (FDA) — Comprehensive drug labeling data via automated ingestion pipeline
- OpenFDA — Adverse events and drug product data
- RxNorm — Clinical drug terminology and normalization
- MedlinePlus — Consumer health information
- Unified RAG endpoint for AI-powered drug consultations

### Additional Features
- Drug-drug interaction checker
- Medical report generation and comparison
- Health timeline with medication scheduling
- Chat with AI health assistant
- Bookmarking and recent search persistence (localStorage)
- Dark-theme responsive UI with glassmorphism design system

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, TailwindCSS, Framer Motion, React Markdown |
| Backend | Python 3.11+, FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL (Supabase) |
| Vector Store | Qdrant |
| AI | Google Gemini API |
| Auth | python-jose, passlib, bcrypt |
| Infrastructure | Docker Compose |

## Project Structure

```
├── frontend/                     # Next.js 14 App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── drugs/           # Drug search page (state machine, layout)
│   │   │   ├── login/           # Login with OTP and social auth
│   │   │   ├── dashboard/       # User dashboard with health metrics
│   │   │   ├── chat/            # AI health assistant chat
│   │   │   ├── consult/         # AI drug consultation
│   │   │   ├── medications/     # Medication management
│   │   │   ├── reports/         # Medical report generation
│   │   │   └── library/         # Medical library search
│   │   ├── components/
│   │   │   ├── drugs/           # Drug search components
│   │   │   ├── auth/            # Authentication components
│   │   │   ├── consult/         # Consultation components
│   │   │   └── layout/          # App shell, sidebar, header
│   │   ├── lib/
│   │   │   └── utils.ts         # formatDrugName, apiFetch, auth utilities
│   │   └── store/
│   │       └── auth-context.tsx  # Auth context with token management
│   └── package.json
│
├── backend/                      # FastAPI application
│   ├── app/
│   │   ├── api/v1/endpoints/    # REST endpoints (drugs, auth, chat, reports, etc.)
│   │   ├── core/                # Config, database, security utilities
│   │   ├── domain/              # Business logic (DailyMed, medical library)
│   │   ├── infrastructure/      # AI provider, embedding, vector store
│   │   ├── middleware/          # Auth middleware, rate limiting
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/            # Business services (drug, auth, rag, chat, etc.)
│   │   └── workers/             # Background task workers
│   ├── alembic/                 # Database migrations
│   ├── scripts/                 # Data ingestion scripts
│   └── requirements.txt
│
├── docker-compose.yml           # Docker setup for backend + frontend
├── start.sh                     # Local dev startup script
└── .env.example                 # Environment variable template
```

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL
- Qdrant (vector store)
- Google Gemini API key

### Setup

1. **Clone and configure**
   ```bash
   git clone https://github.com/rahul-dev-6386/Medico.git
   cd Medico
   cp .env.example .env
   # Edit .env with your database URL, API keys, and JWT secret
   ```

2. **Backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Open** `http://localhost:3000`

### Docker
```bash
docker compose up
```

## Environment Variables

Key variables (see `.env.example` for full list):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: `http://localhost:8000/api`) |

## License

MIT
