# HealthAI — AI-Powered Personal Health Assistant

A production-grade healthcare platform built with FastAPI + Next.js that provides AI-driven medical document analysis, biomarker tracking, risk assessment, and personalized health recommendations.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)             │
│  Port 3000 │ React 18 │ Tailwind │ TypeScript        │
│  Radix UI │ Framer Motion │ Recharts                 │
├─────────────────────────────────────────────────────┤
│                    API Layer (REST)                   │
├─────────────────────────────────────────────────────┤
│                  Backend (FastAPI)                    │
│  Port 8000 │ Python 3.11 │ SQLAlchemy │ Alembic      │
│  22 Services │ 17 Models │ 13 Routers                │
├─────────────────────────────────────────────────────┤
│          PostgreSQL │ Qdrant/FAISS │ File Storage     │
└─────────────────────────────────────────────────────┘
```

- **Backend**: `/home/rahul/medi/backend/` — FastAPI server on port 8000
- **Frontend**: `/home/rahul/medi/frontend/` — Next.js 14 app on port 3000
- **Database**: PostgreSQL via Docker (`medi-db-1`), database `health_assistant`
- **Vector Store**: FAISS index at `./data/faiss_index`

---

## AI Provider System (LangChain)

All AI analysis flows through `AIProviderService` (`backend/app/services/ai_provider_service.py`) using **LangChain's unified model interface** (`BaseChatModel`).

### Dynamic Provider Loading

Providers are initialized from config — only those with valid API keys in `.env` are added to the chain:

```python
# app/config.py
GEMINI_API_KEY      → ChatGoogleGenerativeAI(model=gemini-2.5-flash)
OPENAI_API_KEY      → ChatOpenAI(model=gpt-4o-mini)
DEEPSEEK_API_KEY    → ChatOpenAI(model=deepseek-v4-flash, base_url=https://api.deepseek.com)
```

The failover chain is built dynamically at startup:

```
gemini → openai → deepseek → LocalFallback
         ^ only if key is set
```

Every AI result is cached in the `ai_cache` table (keyed by SHA-256 of prompt + system instruction). Never re-calls an AI for already-analyzed content.

### Adding a New Provider

To add a new provider (e.g. Anthropic, Groq, Mistral):

1. Add `PROVIDER_API_KEY` + `PROVIDER_MODEL` to `app/config.py`
2. Add the provider config tuple to `_init_providers()` in `ai_provider_service.py`
3. If it's OpenAI-compatible → `ChatOpenAI` (just set `base_url`). Otherwise → add an `elif` branch in `LangChainProvider._init()`.

### 5 Public Methods

| Method | Purpose |
|--------|---------|
| `generate_response()` | Free-text AI response (summaries, chat, queries) |
| `generate_structured()` | JSON-extracted data (classification, lab values) |
| `generate_medical_analysis()` | Full medical document analysis |
| `generate_chat_response()` | Conversational chat with context |
| `generate_daily_routine()` | Personalized daily health routine |

---

## Backend Structure

### `backend/app/config.py` — Settings
Pydantic-settings loading from `/home/rahul/medi/.env`. Key fields: `DATABASE_URL`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `JWT_SECRET`, `UPLOAD_DIR`, `FAISS_INDEX_PATH`, `EMBEDDING_MODEL`.

### `backend/app/main.py` — App Entry
FastAPI app with CORS, 13 routers, startup event that creates DB tables and initializes the vector store.

### `backend/app/database.py` — DB Connection
SQLAlchemy engine + session factory. `get_db()` dependency for request-scoped sessions.

### Routers (13 total)

| Router | File | Lines | Purpose |
|--------|------|-------|---------|
| **auth** | `routers/auth.py` | 63 | Register, login, Google OAuth, JWT tokens |
| **profiles** | `routers/profiles.py` | 124 | Patient profile CRUD |
| **chat** | `routers/chat.py` | 102 | Chat sessions & messages |
| **memory** | `routers/memory.py` | 70 | Memory entries (journaling) |
| **metrics** | `routers/metrics.py` | 139 | Daily health metrics |
| **analytics** | `routers/analytics.py` | 51 | Aggregated statistics |
| **medications** | `routers/medications.py` | 136 | Medication CRUD + adherence |
| **reports** | `routers/reports.py` | 67 | Report upload, list, get, delete |
| **knowledge** | `routers/knowledge.py` | 105 | Medical guidelines, drugs, PubMed search |
| **routines** | `routers/routines.py` | 27 | Daily routine generation |
| **voice** | `routers/voice.py` | 36 | Voice interaction |
| **notifications** | `routers/notifications.py` | 70 | Notification config & list |
| **intelligence** | `routers/intelligence.py` | 482 | **Core AI router** — 17 endpoints |

### Intelligence Endpoints (17)

Base: `/api/intelligence`

| Endpoint | Returns |
|----------|---------|
| `GET /reports/{id}/summary` | Report summary + document type |
| `GET /reports/{id}/lab-values` | Extracted lab values with flags |
| `GET /reports/{id}/risk-scores` | Risk scoring with reasons |
| `GET /reports/{id}/biomarkers` | Biomarker tracking data |
| `GET /reports/{id}/biomarker-history` | Biomarker trend history |
| `GET /reports/{id}/insights` | AI-generated insights |
| `GET /reports/{id}/timeline` | Timeline events |
| `GET /reports/{id}/findings` | Medical findings by section |
| `GET /reports/{id}/history` | Historical report data |
| `GET /reports/{id}/comparison` | Cross-report comparison |
| `GET /patients/{id}/history` | Full patient history |
| `GET /patients/{id}/comparison` | Patient-level comparison |
| `GET /health-score` | Overall health score |
| `GET /risk-predictions` | ML-based risk predictions |
| `POST /query` | Natural language query |
| `GET /vector-store-status` | Vector store health |

### Models (17)

All in `backend/app/models/`, re-exported via `__init__.py`:

| Model | Table | Purpose |
|-------|-------|---------|
| `User` | `users` | Auth, JWT, Google OAuth |
| `PatientProfile` | `patient_profiles` | Medical profile, conditions, allergies |
| `ChatSession` | `chat_sessions` | Chat conversation groups |
| `ChatMessage` | `chat_messages` | Individual messages |
| `MemoryEntry` | `memory_entries` | Daily journal entries |
| `DailyMetric` | `daily_metrics` | Health metrics (weight, BP, etc.) |
| `Medication` | `medications` | Medication schedules |
| `MedicationAdherence` | `medication_adherence` | Adherence tracking |
| `MedicalReport` | `medical_reports` | Uploaded reports with AI analysis |
| `ReportChunk` | `report_chunks` | Text chunks for RAG |
| `LabValue` | `lab_values` | Extracted lab test values |
| `BiomarkerTracking` | `biomarker_tracking` | Longitudinal biomarker data |
| `TimelineEvent` | `timeline_events` | Medical timeline events |
| `AIInsight` | `ai_insights` | AI-generated insights |
| `AICache` | `ai_cache` | AI response cache |
| `MedicalGuideline` | `medical_guidelines` | Downloaded medical guidelines |
| `DrugEntry` | `drug_database` | Drug interaction database |
| `PubMedArticle` | `pubmed_articles` | PubMed article references |
| `Notification` | `notifications` | User notifications |
| `NotificationConfig` | `notification_configs` | Notification preferences |
| `MetricsEmbedding` | `metrics_embeddings` | Metric vector embeddings |

### Services (22)

| Service | File | Purpose |
|---------|------|---------|
| `AIProviderService` | `ai_provider_service.py` | Unified AI with caching + failover |
| `ReportService` | `report_service.py` | Upload, OCR, classification, extraction |
| `ReportIntelligenceService` | `report_intelligence_service.py` | Lab extraction, biomarker storage, insights |
| `ClassificationService` | `classification_service.py` | Document classification + structured extraction |
| `HealthScoreEngine` | `health_score_engine.py` | Health score 0-100 calculation |
| `RiskPredictor` | `risk_predictor.py` | ML models for 4 disease risks |
| `ChatService` | `chat_service.py` | Chat context management |
| `QueryRouter` | `query_router.py` | NLP query routing |
| `RoutineService` | `routine_service.py` | Daily routine generation |
| `EmbeddingService` | `embedding_service.py` | Text embedding generation |
| `VectorStore` | `vector_store.py` | FAISS/Qdrant vector search |
| `RAGService` | `rag_service.py` | Retrieval-augmented generation |
| `MedicalKnowledgeService` | `medical_knowledge_service.py` | Guidelines retrieval |
| `DrugService` | `drug_service.py` | Drug interaction checking |
| `PubMedService` | `pubmed_service.py` | PubMed article search |
| `CitationEngine` | `citation_engine.py` | Medical citation formatting |
| `SafetyService` | `safety_service.py` | Content safety filtering |
| `AuthService` | `auth_service.py` | Authentication logic |
| `MemoryService` | `memory_service.py` | Memory/journal CRUD |
| `AnalyticsService` | `analytics_service.py` | Aggregated stats |
| `NotificationService` | `notification_service.py` | Push notifications |
| `VoiceService` | `voice_service.py` | Voice interaction handling |

### Utils

| Utils | File | Purpose |
|-------|------|---------|
| Gemini Client | `utils/gemini_client.py` | Google Gemini API wrapper with retry + JSON parsing |
| OCR | `utils/ocr.py` | Tesseract OCR + PyPDF2 extraction |
| Security | `utils/security.py` | Password hashing, token generation |

### ML Models (Trained)

| Model | File | AUC |
|-------|------|-----|
| Diabetes | `data/models/diabetes_model.pkl` | >0.99 |
| Heart Disease | `data/models/heart_disease_model.pkl` | >0.99 |
| CKD | `data/models/ckd_model.pkl` | >0.99 |
| Stroke | `data/models/stroke_model.pkl` | >0.99 |

### Medical Guidelines (Downloaded)

13 guidelines from WHO, CDC, ADA, AHA, KDIGO, NIH covering diabetes, hypertension, CKD, asthma, cardiovascular disease, nutrition, exercise, immunization.

### Document Types Supported

1. Blood Test Report
2. Prescription
3. X-Ray
4. MRI
5. CT Scan
6. ECG
7. Vaccination Record
8. Discharge Summary
9. Medical Certificate
10. Insurance Document
11. General Medical Report

---

## Upload & Processing Pipeline

```
1. User uploads PDF/JPEG/PNG
2. File saved to ./uploads/
3. extract_text() → OCR (Tesseract) or PyPDF2
4. classification_service.classify() → document_type
5. classification_service.extract_structured() → JSON
6. ai_provider.generate_response() → AI summary
7. intelligence.process_report() → lab values, biomarkers
8. _store_biomarkers() → biomarker_tracking table
9. _store_timeline_events() → timeline_events table
10. _store_insights() → ai_insights table
11. _store_in_vector_store() → FAISS index for RAG
```

---

## Health Score

**Range 0-100**

| Category | Range |
|----------|-------|
| Excellent | 90-100 |
| Good | 75-89 |
| Moderate | 60-74 |
| Needs Attention | 40-59 |
| Critical | 0-39 |

Calculated by `HealthScoreEngine` from lab values, biomarkers, risk scores, and historical trends.

---

## Frontend Structure

### Pages (14 routes)

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Landing/redirect |
| `/login` | `app/login/page.tsx` | Login with Google OAuth |
| `/register` | `app/register/page.tsx` | Registration |
| `/dashboard` | `app/dashboard/page.tsx` | Main dashboard with health overview |
| `/reports` | `app/reports/page.tsx` | Report list + slide-over intelligence panel |
| `/reports/[id]` | `app/reports/[id]/page.tsx` | Report detail with 8 tabs |
| `/reports/comparison` | `app/reports/comparison/page.tsx` | Cross-report biomarker comparison |
| `/chat` | `app/chat/page.tsx` | AI chat assistant |
| `/medications` | `app/medications/page.tsx` | Medication management |
| `/metrics` | `app/metrics/page.tsx` | Health metrics tracking |
| `/timeline` | `app/timeline/page.tsx` | Medical timeline |
| `/routines` | `app/routines/page.tsx` | Daily routine planner |
| `/analytics` | `app/analytics/page.tsx` | Analytics |
| `/profile` | `app/profile/page.tsx` | User profile |
| `/settings` | `app/settings/page.tsx` | Settings |

### Reports Detail Tabs

When viewing a report (`/reports/[id]`), 8 tabs are available:
1. **Summary** — AI summary + document metadata
2. **Lab Values** — Extracted lab tests with normal/abnormal flags
3. **Risk Scores** — Disease risk assessment
4. **Biomarkers** — Biomarker tracking data
5. **Insights** — AI-generated medical insights
6. **Timeline** — Event timeline
7. **Findings** — Structured medical findings
8. **Comparison** — Cross-report biomarker comparison

### Report View Components

| Component | File | Purpose |
|-----------|------|---------|
| BloodReportView | `views/blood-report-view.tsx` | Blood test report rendering |
| PrescriptionView | `views/prescription-view.tsx` | Prescription rendering |
| DischargeSummaryView | `views/discharge-summary-view.tsx` | Discharge summary rendering |
| ScanView | `views/scan-view.tsx` | X-Ray/MRI/CT Scan rendering |
| LabValueCard | `lab-value-card.tsx` | Individual lab value display |
| RiskScoreCard | `risk-score-card.tsx` | Risk score visualization |
| InsightCards | `insight-cards.tsx` | AI insight cards |
| MedicalFindings | `medical-findings.tsx` | Structured findings |
| BiomarkerTimeline | `biomarker-timeline.tsx` | Biomarker trend chart |
| HistoricalComparison | `historical-comparison.tsx` | Cross-report comparison |

### UI Components

| Component | File | Purpose |
|-----------|------|---------|
| GlassCard | `ui/glass-card.tsx` | Glassmorphism card container |
| HealthScore | `ui/health-score.tsx` | Health score gauge |
| ProgressRing | `ui/progress-ring.tsx` | SVG progress ring |
| SeverityBadge | `ui/severity-badge.tsx` | Severity indicator badge |
| Button / Card / Input / Label | `ui/` | ShadCN-style primitives |

### Layout

- **AppShell** — Main layout wrapper with sidebar + top header
- **Sidebar** — Navigation: Dashboard, Reports, Chat, Medications, Metrics, Timeline, Routines, Analytics, Profile, Settings
- **Header** — Search, notifications, user menu
- **TopHeader** — Secondary top bar

### State Management

- **AuthContext** — JWT token, user state, login/logout
- **ThemeContext** — Dark/light mode toggle

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + CSS variables for theming
- **Animations**: Framer Motion
- **Charts**: Recharts
- **UI Library**: Radix UI (Dialog, Dropdown, Tabs, Toast, Popover, Select)
- **Icons**: Lucide React
- **Utilities**: clsx, tailwind-merge, class-variance-authority
- **Date**: date-fns

---

## Database Schema (PostgreSQL)

```
users
  ├── patient_profiles (1:1)
  ├── chat_sessions → chat_messages
  ├── memory_entries
  ├── daily_metrics
  ├── medications → medication_adherence
  ├── medical_reports → report_chunks → lab_values
  ├── medical_reports → biomarker_tracking
  ├── medical_reports → timeline_events
  ├── medical_reports → ai_insights
  ├── notifications ← notification_configs
  └── metrics_embeddings

global:
  medical_guidelines
  pubmed_articles
  drug_database
  ai_cache
```

---

## Setup & Running

### Environment Variables (`/home/rahul/medi/.env`)

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/health_assistant
JWT_SECRET=<your-secret>
GEMINI_API_KEY=<your-gemini-key>
DEEPSEEK_API_KEY=<your-deepseek-key>
```

### Backend

```bash
cd /home/rahul/medi/backend
source venv/bin/activate
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd /home/rahul/medi/frontend
npm run dev
```

### Database Migrations

```bash
cd /home/rahul/medi/backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Setup Medical Intelligence

```bash
cd /home/rahul/medi/backend
source venv/bin/activate
python setup_medical_intelligence.py
```

This trains ML models, downloads guidelines, initializes FAISS vector store, and downloads drug/PubMed data.

---

## API Authentication

JWT-based. Obtain token via:
- `POST /api/auth/register` — creates user + returns token
- `POST /api/auth/login` — returns token
- `POST /api/auth/google` — Google OAuth login

All protected endpoints require header: `Authorization: Bearer <token>`

Test user (ID 5): `test@example.com`

---

## Key Design Decisions

1. **AI failover chain** — Never returns 500 due to AI provider failure. Returns 503 with meaningful message if all providers down.
2. **AI response caching** — SHA-256 hash of prompt + system instruction. Deduplicates identical requests across users and sessions.
3. **Provider isolation** — Each AI provider is a separate class; chain-of-responsibility pattern. Adding a new provider means creating a class + adding it to the chain.
4. **Local fallback** — Rule-based responses for summaries, routines, diagnosis explanations, and structured extraction. Runs entirely without API calls.
5. **Biomarker tracking** — Separate from lab values. Lab values are per-report snapshots; biomarker_tracking is longitudinal across all reports.
6. **Intelligence endpoints query BiomarkerTracking first** — Falls back to LabValue table for backward compatibility.
7. **Document types** — 11 supported types with structured extraction tailored to each.
8. **Health score** — Composite score from lab results, risk factors, and biomarker trends.
9. **Docker-ready** — Both services have production Dockerfiles (multi-stage for frontend).
10. **Dark mode first** — Premium healthcare SaaS design with dark theme as default.

---

## Medical RAG Knowledge Base

### Architecture

The RAG system processes 8 medical textbooks (~289MB of PDFs) into a searchable knowledge base using:

```
PDF → extract chapters/sections → semantic chunking → BGE embeddings → Qdrant (local)
                                                                       ↓
                                                              FastAPI retrieval endpoints
```

All RAG code is in `backend/app/rag/`:
- `pdf_extractor.py` — PDF text extraction with chapter/section detection
- `chunker.py` — Semantic chunking (750 tokens) with table/dosage protection
- `embedder.py` — BAAI/bge-small-en-v1.5 embeddings (384-dim)
- `indexer.py` — Qdrant local mode CRUD
- `retriever.py` — Semantic search + citation formatting
- `ingestion_pipeline.py` — Full orchestrator

### 4 Collections

| Collection | Books |
|------------|-------|
| **diseases** | Harrison's, Davidson's, Current Medical Diagnosis 2025, Merck Manual |
| **laboratory** | Oxford Handbook of Clinical & Lab Investigation, Merck Manual |
| **pharmacology** | Goodman & Gilman, Basic & Clinical Pharmacology |
| **clinical_practice** | Oxford Handbook of Clinical Medicine |

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/rag/collections` | List collections with chunk counts |
| `GET /api/rag/search?q=...&collection=...` | Semantic search |
| `POST /api/rag/query` | Search with JSON body |

All results include source citations:
```
Source:
  Book: Harrison's Principles of Internal Medicine
  Chapter: Diabetes Mellitus
  Section: Diagnosis
  Page: 287
```

### Running Ingestion on Lightning AI (GPU)

Since embedding happens on Lightning AI, not locally:

1. Upload the 8 PDFs to Lightning AI Studio in a `books/` folder
2. Install deps: `pip install -r requirements_rag.txt`
3. Run: `python lightning_rag.py`
4. Download the resulting `qdrant_db/` directory
5. Place at `backend/data/qdrant/`
6. Restart backend — search works immediately

The standalone `lightning_rag.py` at project root bundles extraction, chunking, embedding, and Qdrant upload into one self-contained script.

---

## File Size Summary

| Area | Files | Total Lines |
|------|-------|-------------|
| Backend Python | ~60 | ~6,500 |
| Frontend TSX/TS | ~42 | ~4,500 |
| **Total** | **~102** | **~11,000** |
