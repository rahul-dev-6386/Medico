# AI Personal Health Assistant - Implementation Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│  ┌──────────┐ ┌───────────┐ ┌────────────────────┐  │
│  │  Auth UI  │ │ Dashboard│ │   Chat Interface   │  │
│  └──────────┘ └───────────┘ └────────────────────┘  │
│  ┌──────────┐ ┌───────────┐ ┌────────────────────┐  │
│  │  Profile  │ │ Metrics   │ │  Report Viewer     │  │
│  └──────────┘ └───────────┘ └────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────┴──────────────────────────────┐
│                Backend (FastAPI)                     │
│  ┌──────────┐ ┌───────────┐ ┌────────────────────┐  │
│  │ Auth API │ │ User API  │ │   Chat API         │  │
│  └──────────┘ └───────────┘ └────────────────────┘  │
│  ┌──────────┐ ┌───────────┐ ┌────────────────────┐  │
│  │ Report   │ │ Analytics │ │   Medication API   │  │
│  │ API      │ │ API       │ │                    │  │
│  └──────────┘ └───────────┘ └────────────────────┘  │
│  ┌──────────┐ ┌───────────┐ ┌────────────────────┐  │
│  │ Voice    │ │ Notification│ │  Safety Layer     │  │
│  │ API      │ │ API       │ │                    │  │
│  └──────────┘ └───────────┘ └────────────────────┘  │
└──────┬──────────────┬──────────────┬────────────────┘
       │              │              │
┌──────┴──┐   ┌───────┴───────┐   ┌─┴──────────────┐
│PostgreSQL│   │ FAISS Vector │   │   File Storage  │
│          │   │    Store     │   │ (Local / S3)    │
└──────────┘   └──────────────┘   └─────────────────┘
       │              │
       └──────┬───────┘
       ┌──────┴───────┐
       │  Gemini API  │
       └──────────────┘
```

---

## Phase 1: Project Scaffolding & Auth (Week 1)

### 1.1 Frontend Setup
- Initialize Next.js project with TypeScript
- Install and configure Tailwind CSS + ShadCN UI
- Set up project folder structure
- Configure ESLint, Prettier

### 1.2 Backend Setup
- Initialize FastAPI project with Python
- Set up project structure (routers, models, schemas, services)
- Configure PostgreSQL connection (SQLAlchemy + Alembic)
- Set up dependency injection

### 1.3 Authentication System
**Backend:**
- User model (id, email, hashed_password, full_name, created_at, updated_at)
- JWT token generation & validation
- Register endpoint (POST /api/auth/register)
- Login endpoint (POST /api/auth/login)
- Google OAuth integration
- Password hashing with bcrypt
- Middleware for protected routes

**Frontend:**
- Login page
- Register page
- Google OAuth button
- Auth context/state management
- Protected route wrapper
- Token storage & auto-refresh

---

## Phase 2: Patient Profile Management (Week 2)

### 2.1 Backend
- PatientProfile model (extends User):
  - Personal: name, age, gender, height, weight, blood_group
  - Medical: allergies (JSON), chronic_diseases (JSON), previous_surgeries (JSON), family_history (JSON), current_medications (JSON)
  - Lifestyle: smoking_status, alcohol_consumption, activity_level, dietary_preferences
- CRUD endpoints:
  - POST /api/profile (create)
  - GET /api/profile (get own profile)
  - PUT /api/profile (update)
  - GET /api/profile/medical-history
  - PUT /api/profile/medical-history

### 2.2 Frontend
- Profile setup wizard (multi-step form)
- Profile view/edit page
- Medical history management
- Lifestyle preferences form

---

## Phase 3: AI Chat Assistant (Week 3)

### 3.1 Backend - Chat Service
- ChatSession model (id, user_id, created_at, updated_at, title)
- ChatMessage model (id, session_id, role, content, created_at)
- POST /api/chat/sessions (create new session)
- GET /api/chat/sessions (list user sessions)
- GET /api/chat/sessions/{id}/messages
- POST /api/chat/sessions/{id}/messages (send message)

### 3.2 AI Integration
- Gemini API client setup
- System prompt construction (injects patient profile context)
- Context-aware response generation
- Message history injection for conversation continuity
- Streaming response support (Server-Sent Events)

### 3.3 Patient Memory Injection
- Build "Patient Summary" from profile, metrics, reports
- Auto-inject summary into every chat context
- Update summary continuously based on new data

### 3.4 Frontend
- Chat interface UI (chat bubble layout)
- Session sidebar
- Message input with send button
- Streaming response display
- Loading states & error handling

---

## Phase 4: Long-Term Memory System (Week 4)

### 4.1 Memory Store
- MemoryEntry model (id, user_id, category, key, value, created_at, updated_at)
- Categories: conditions, medications, allergies, reports, goals, symptoms, lifestyle
- CRUD endpoints for memory management

### 4.2 Automated Memory Updates
- Extract key info from chat conversations
- Update memory when profile changes
- Update memory when new reports are uploaded
- Update memory when daily metrics are logged

### 4.3 Memory Injection Pipeline
- Build structured patient summary
- Inject into system prompt for every AI chat
- Include recent relevant history

---

## Phase 5: Daily Health Tracking (Week 4-5)

### 5.1 Backend
- DailyMetric model (id, user_id, date, sleep_hours, water_ml, weight_kg, exercise_min, steps, mood, energy_level, blood_pressure_sys, blood_pressure_dia, blood_sugar, heart_rate, oxygen_sat)
- Endpoints:
  - POST /api/metrics (log daily metric)
  - GET /api/metrics (list with date range, pagination)
  - GET /api/metrics/latest
  - GET /api/metrics/range?start_date=&end_date=
  - GET /api/metrics/stats (averages, trends)

### 5.2 Frontend
- Daily check-in form
- Quick-log widgets (water, sleep, mood)
- Calendar view with heatmap
- History viewer with filters

---

## Phase 6: Health Analytics Engine (Week 5-6)

### 6.1 Backend
- Analytics service methods:
  - `calculate_sleep_trend(user_id, days)` - sleep trend analysis
  - `calculate_weight_trend(user_id, days)` - weight trend
  - `calculate_exercise_consistency(user_id, days)` - exercise score (0-100)
  - `calculate_hydration_score(user_id, days)` - hydration score
  - `calculate_mood_trend(user_id, days)` - mood patterns
  - `detect_unhealthy_patterns(user_id)` - anomaly detection
  - `generate_monthly_report(user_id, month, year)` - monthly health report
- Endpoints:
  - GET /api/analytics/trends?type=sleep|weight|mood&days=30
  - GET /api/analytics/scores (exercise, hydration, medication adherence)
  - GET /api/analytics/patterns (unhealthy pattern detection)
  - GET /api/analytics/monthly-report?month=&year=

### 6.2 Frontend
- Dashboard with analytics cards
- Trend charts (line charts using recharts/chart.js)
- Score displays (circular progress)
- Monthly report view
- Pattern alerts & notifications

---

## Phase 7: Medication Management (Week 6)

### 7.1 Backend
- Medication model (id, user_id, name, dosage, frequency, time_of_day, start_date, end_date, notes, active)
- Endpoints:
  - POST /api/medications (add)
  - GET /api/medications (list active)
  - GET /api/medications/{id}
  - PUT /api/medications/{id} (update)
  - DELETE /api/medications/{id} (soft delete)
  - POST /api/medications/{id}/adherence (log taken/skipped)

### 7.2 Frontend
- Medication list view
- Add/edit medication form
- Adherence tracking (check off taken doses)
- Calendar view showing medication schedule

---

## Phase 8: Medical Report Analysis (Week 7-8)

### 8.1 Backend - File Upload
- MedicalReport model (id, user_id, title, file_type, file_path, original_filename, uploaded_at, processed, summary)
- File upload endpoint (POST /api/reports/upload)
- Support: PDF, JPG, JPEG, PNG
- Local storage (dev) / S3 (prod) integration

### 8.2 Processing Pipeline
- **OCR Extraction**: Use Tesseract/Gemini vision for extracting text from images/PDFs
- **Medical Info Extraction**: Use Gemini API to extract structured medical info from text
- **AI Summarization**: Generate report summary highlighting abnormal values, observations
- **Storage**: Store original file, extracted text, and AI summary

### 8.3 Endpoints
- POST /api/reports/upload (upload + trigger processing)
- GET /api/reports (list user reports)
- GET /api/reports/{id} (get report details)
- GET /api/reports/{id}/file (download original file)
- DELETE /api/reports/{id}

### 8.4 Frontend
- Report upload page (drag & drop)
- Report list view
- Report detail view (with extracted data & AI summary)
- Highlighted abnormal values

---

## Phase 9: Medical Knowledge Retrieval (RAG) (Week 8-9)

### 9.1 Knowledge Base Setup
- FAISS vector store setup
- Pre-process medical knowledge sources into chunks
- Generate embeddings using Gemini embedding API
- Store embeddings in FAISS index with metadata

### 9.2 RAG Pipeline
- User question → embed query → FAISS similarity search → retrieve top-k chunks → inject into Gemini prompt → generate evidence-based response
- Response includes citations from retrieved sources

### 9.3 Endpoints
- POST /api/knowledge/search?query= (search knowledge base)
- POST /api/knowledge/ingest (admin: add documents to KB)
- POST /api/knowledge/rebuild-index (admin: rebuild FAISS index)

---

## Phase 10: Personalized Routine Generator (Week 9)

### 10.1 Backend
- POST /api/routines/generate-daily (generate daily plan)
- POST /api/routines/generate-weekly (generate weekly plan)
- GET /api/routines/current (get current routine)
- PUT /api/routines/customize (user adjusts routine)

### 10.2 Generation Logic
- Input: age, weight, conditions, medications, health goals, historical logs
- AI prompt: "Generate personalized daily routine based on..."
- Output: wake_time, sleep_time, water_goal, walking_goal, exercise_suggestions, nutrition_recommendations

### 10.3 Frontend
- Daily routine card view
- Routine generator trigger
- Customization options
- Weekly plan view

---

## Phase 11: Voice Assistant (Week 10)

### 11.1 Backend
- POST /api/voice/stt (speech-to-text: accepts audio file, returns text)
- POST /api/voice/tts (text-to-speech: accepts text, returns audio)
- Integration with Gemini audio capabilities or third-party APIs (Google Speech-to-Text / Text-to-Speech)

### 11.2 Frontend
- Microphone button on chat
- Audio recording & playback
- Voice input mode toggle
- Audio visualization

---

## Phase 12: Notification System (Week 10-11)

### 12.1 Backend
- Notification model (id, user_id, type, title, body, scheduled_at, sent_at, read)
- NotificationConfig model (id, user_id, medication_reminders, water_reminders, exercise_reminders, sleep_reminders, health_check_reminders)
- Endpoints:
  - POST /api/notifications/config (configure notification preferences)
  - GET /api/notifications/config
  - GET /api/notifications (list notifications)
  - PUT /api/notifications/{id}/read (mark as read)
  - GET /api/notifications/upcoming (next reminders)

### 12.2 Scheduling
- Background task scheduler (APScheduler or Celery)
- Generate reminders based on medication schedule
- Generate periodic reminders (water, exercise, sleep)
- Configurable timing and frequency

### 12.3 Frontend
- Notification preferences page
- Notification list/bell icon
- Browser notification integration (Service Workers)

---

## Phase 13: AI Safety Layer (Week 11)

### 13.1 Emergency Detection
- Pre-process all user messages before AI response
- Detect emergency keywords/phrases:
  - "chest pain", "heart attack", "stroke", "severe bleeding"
  - "suicidal", "want to die", "self-harm"
  - "difficulty breathing", "can't breathe"
  - "severe allergic reaction", "anaphylaxis"
- Regex + AI-based detection

### 13.2 Safety Response
- If emergency detected:
  - Skip normal AI flow
  - Return structured emergency response:
    ```json
    {
      "emergency": true,
      "message": "Please call emergency services immediately.",
      "suggested_action": "Call 911 / local emergency number"
    }
    ```
- Log all safety triggers for audit

### 13.3 Content Guardrails
- Prevent AI from giving definitive diagnoses
- Always include disclaimer: "I am an AI assistant, not a doctor."
- Block harmful/unsafe content generation

---

## Phase 14: Doctor Dashboard (Future Scope - Design Only)

### 14.1 Design
- Doctor model (extends User with role="doctor")
- Patient-Doctor association model
- Design API contracts for future:
  - GET /api/doctor/patients (list assigned patients)
  - GET /api/doctor/patients/{id}/summary
  - GET /api/doctor/patients/{id}/reports
  - GET /api/doctor/patients/{id}/trends
  - GET /api/doctor/patients/{id}/medications
- Design role-based access control middleware

---

## Phase 15: Wearable Integration (Future Scope - Design Only)

### 15.1 Design
- Design integration interfaces:
  - Google Fit API
  - Fitbit API
  - Apple Health (via HealthKit)
- Data mapping layer design
- API contract design for importing wearable data
- Sync frequency & conflict resolution strategy

---

## Database Schema Overview

```sql
-- Users & Auth
users (id, email, hashed_password, full_name, provider, provider_id, avatar_url, role, created_at, updated_at)

-- Patient Profiles
patient_profiles (id, user_id(FK), date_of_birth, gender, height_cm, weight_kg, blood_group, 
                  allergies[], chronic_diseases[], previous_surgeries[], family_history[], 
                  smoking_status, alcohol_consumption, activity_level, dietary_preferences)

-- Chat
chat_sessions (id, user_id(FK), title, created_at, updated_at)
chat_messages (id, session_id(FK), role, content, created_at)

-- Memory
memory_entries (id, user_id(FK), category, key, value, created_at, updated_at)

-- Health Metrics
daily_metrics (id, user_id(FK), date, sleep_hours, water_ml, weight_kg, exercise_min, steps, 
               mood, energy_level, blood_pressure_sys, blood_pressure_dia, blood_sugar, 
               heart_rate, oxygen_saturation)

-- Medications
medications (id, user_id(FK), name, dosage, frequency, times[], start_date, end_date, notes, active)
medication_adherence (id, medication_id(FK), scheduled_time, taken, taken_at)

-- Medical Reports
medical_reports (id, user_id(FK), title, file_type, file_path, original_filename, 
                 extracted_text, ai_summary, uploaded_at, processed)

-- Notifications
notifications (id, user_id(FK), type, title, body, scheduled_at, sent_at, read)
notification_configs (id, user_id(FK), medication_reminders, water_reminders, ...)

-- Doctor-Patient (future)
doctor_patients (id, doctor_id(FK), patient_id(FK), assigned_at)
```

---

## Project Structure

```
/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── profile.py
│   │   │   ├── chat.py
│   │   │   ├── memory.py
│   │   │   ├── metrics.py
│   │   │   ├── medication.py
│   │   │   ├── report.py
│   │   │   └── notification.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── profile.py
│   │   │   ├── chat.py
│   │   │   ├── metrics.py
│   │   │   ├── medication.py
│   │   │   └── report.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── profiles.py
│   │   │   ├── chat.py
│   │   │   ├── memory.py
│   │   │   ├── metrics.py
│   │   │   ├── analytics.py
│   │   │   ├── medications.py
│   │   │   ├── reports.py
│   │   │   ├── knowledge.py
│   │   │   ├── routines.py
│   │   │   ├── voice.py
│   │   │   └── notifications.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── chat_service.py
│   │   │   ├── memory_service.py
│   │   │   ├── analytics_service.py
│   │   │   ├── report_service.py
│   │   │   ├── rag_service.py
│   │   │   ├── routine_service.py
│   │   │   ├── voice_service.py
│   │   │   ├── notification_service.py
│   │   │   └── safety_service.py
│   │   ├── middleware/
│   │   │   ├── auth_middleware.py
│   │   │   └── rate_limit.py
│   │   └── utils/
│   │       ├── security.py
│   │       ├── gemini_client.py
│   │       └── ocr.py
│   ├── alembic/
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── dashboard/
│   │   │   ├── profile/
│   │   │   ├── chat/
│   │   │   ├── metrics/
│   │   │   ├── analytics/
│   │   │   ├── medications/
│   │   │   ├── reports/
│   │   │   ├── routines/
│   │   │   └── settings/
│   │   ├── components/
│   │   │   ├── ui/ (shadcn)
│   │   │   ├── auth/
│   │   │   ├── chat/
│   │   │   ├── metrics/
│   │   │   ├── analytics/
│   │   │   ├── medications/
│   │   │   ├── reports/
│   │   │   └── layout/
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   ├── store/ (state management)
│   │   └── types/
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── Dockerfile
│
├── docker-compose.yml
└── .env.example
```

---

## API Endpoints Summary

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| POST | /api/auth/google | Google OAuth |
| POST | /api/auth/refresh | Refresh token |
| GET | /api/auth/me | Get current user |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/profile | Create profile |
| GET | /api/profile | Get profile |
| PUT | /api/profile | Update profile |
| GET | /api/profile/medical-history | Get medical history |
| PUT | /api/profile/medical-history | Update medical history |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/chat/sessions | List sessions |
| POST | /api/chat/sessions | Create session |
| GET | /api/chat/sessions/{id}/messages | Get messages |
| POST | /api/chat/sessions/{id}/messages | Send message (stream) |

### Memory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/memory | Get memory |
| POST | /api/memory | Add memory entry |
| PUT | /api/memory/{id} | Update memory |
| DELETE | /api/memory/{id} | Delete memory |

### Metrics
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/metrics | Log metric |
| GET | /api/metrics | List metrics |
| GET | /api/metrics/latest | Latest metrics |
| GET | /api/metrics/range | Metrics by date range |
| GET | /api/metrics/stats | Aggregated stats |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/trends | Trend analysis |
| GET | /api/analytics/scores | Health scores |
| GET | /api/analytics/patterns | Pattern detection |
| GET | /api/analytics/monthly-report | Monthly report |

### Medications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/medications | Add medication |
| GET | /api/medications | List medications |
| GET | /api/medications/{id} | Get medication |
| PUT | /api/medications/{id} | Update medication |
| DELETE | /api/medications/{id} | Delete medication |
| POST | /api/medications/{id}/adherence | Log adherence |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/reports/upload | Upload report |
| GET | /api/reports | List reports |
| GET | /api/reports/{id} | Get report |
| GET | /api/reports/{id}/file | Download file |
| DELETE | /api/reports/{id} | Delete report |

### Knowledge (RAG)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/knowledge/search | Search knowledge base |
| POST | /api/knowledge/ingest | Add document (admin) |
| POST | /api/knowledge/rebuild-index | Rebuild index (admin) |

### Routines
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/routines/generate-daily | Generate daily routine |
| POST | /api/routines/generate-weekly | Generate weekly routine |
| GET | /api/routines/current | Get current routine |
| PUT | /api/routines/customize | Customize routine |

### Voice
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/voice/stt | Speech-to-text |
| POST | /api/voice/tts | Text-to-speech |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications | List notifications |
| PUT | /api/notifications/{id}/read | Mark as read |
| GET | /api/notifications/config | Get config |
| POST | /api/notifications/config | Update config |
| GET | /api/notifications/upcoming | Upcoming reminders |

---

## Implementation Order Summary

| Phase | Feature | Duration | Dependencies |
|-------|---------|----------|--------------|
| 1 | Project Scaffolding & Auth | Week 1 | None |
| 2 | Patient Profile | Week 2 | Phase 1 |
| 3 | AI Chat Assistant | Week 3 | Phase 1, 2 |
| 4 | Long-Term Memory | Week 4 | Phase 3 |
| 5 | Daily Health Tracking | Week 4-5 | Phase 1 |
| 6 | Health Analytics | Week 5-6 | Phase 5 |
| 7 | Medication Management | Week 6 | Phase 1 |
| 8 | Medical Report Analysis | Week 7-8 | Phase 1, 3 |
| 9 | RAG Knowledge System | Week 8-9 | Phase 1, 3 |
| 10 | Routine Generator | Week 9 | Phase 2, 3, 5 |
| 11 | Voice Assistant | Week 10 | Phase 3 |
| 12 | Notification System | Week 10-11 | Phase 7 |
| 13 | AI Safety Layer | Week 11 | Phase 3 |
| 14 | Doctor Dashboard (Design) | Future | Phase 2, 6, 7, 8 |
| 15 | Wearable Integration (Design) | Future | Phase 5 |

**Total estimated time: ~11 weeks for core features**
