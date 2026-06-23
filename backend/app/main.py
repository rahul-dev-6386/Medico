from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth,
    profiles,
    chat,
    memory,
    metrics,
    analytics,
    medications,
    reports,
    knowledge,
    routines,
    voice,
    notifications,
    intelligence,
    rag,
)

app = FastAPI(
    title="AI Health Assistant API",
    description="Backend API for the AI-powered Personal Health Assistant with Medical Intelligence Platform",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(chat.router)
app.include_router(memory.router)
app.include_router(metrics.router)
app.include_router(analytics.router)
app.include_router(medications.router)
app.include_router(reports.router)
app.include_router(knowledge.router)
app.include_router(routines.router)
app.include_router(voice.router)
app.include_router(notifications.router)
app.include_router(intelligence.router)
app.include_router(rag.router)


@app.on_event("startup")
def startup():
    from app.database import engine, Base
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully")
    except Exception as e:
        print(f"Warning: Could not connect to database: {e}")
        print("The app will start but database operations will fail until the DB is available.")

    from app.services.vector_store import vector_store
    try:
        vector_store.initialize()
        print(f"Vector store initialized: {vector_store.get_status()}")
    except Exception as e:
        print(f"Warning: Could not initialize vector store: {e}")


@app.get("/api/health")
def health_check():
    from app.database import SessionLocal
    db_ok = False
    try:
        db = SessionLocal()
        db.execute(
            __import__("sqlalchemy", fromlist=["text"]).text("SELECT 1")
        )
        db.close()
        db_ok = True
    except Exception:
        pass
    return {"status": "healthy", "database": db_ok, "version": "1.0.0"}
