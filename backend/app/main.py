import typing
import functools

# Monkey-patch ForwardRef._evaluate for Python 3.12+ compatibility.
# Libraries (pydantic v1 compat, paddlepaddle, etc.) call the old 3.11
# signature that lacks the ``recursive_guard`` keyword-only parameter.
_evaluate_orig = typing.ForwardRef._evaluate
@functools.wraps(_evaluate_orig)
def _evaluate_patch(self, globalns, localns, type_params=None, recursive_guard=None):
    if recursive_guard is None:
        recursive_guard = set()
    return _evaluate_orig(self, globalns, localns, type_params=type_params, recursive_guard=recursive_guard)
typing.ForwardRef._evaluate = _evaluate_patch

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints import (
    auth,
    profiles,
    chat,
    memory,
    metrics,
    analytics,
    medications,
    reports,
    routines,
    voice,
    notifications,
    intelligence,
    library,
    bot,
    drugs,
)

try:
    from app.api.v1.endpoints import knowledge
    _has_knowledge = True
except Exception:
    _has_knowledge = False
    import logging
    logging.getLogger(__name__).warning("knowledge router unavailable (LangChain broken)")

app = FastAPI(
    title="AI Health Assistant API",
    description="Backend API for the AI-powered Personal Health Assistant with Medical Intelligence Platform",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
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
if _has_knowledge:
    app.include_router(knowledge.router)
app.include_router(routines.router)
app.include_router(voice.router)
app.include_router(notifications.router)
app.include_router(intelligence.router)
app.include_router(library.router)
app.include_router(bot.router)
app.include_router(drugs.router)


@app.on_event("startup")
def startup():
    from app.core.database import engine, Base
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully")
    except Exception as e:
        print(f"Warning: Could not connect to database: {e}")
        print("The app will start but database operations will fail until the DB is available.")

    from app.infrastructure.vector_store import vector_store
    try:
        vector_store.initialize()
        print(f"Vector store initialized: {vector_store.get_status()}")
    except Exception as e:
        print(f"Warning: Could not initialize vector store: {e}")

    from app.domain.medical_library import indexer as lib_indexer
    try:
        lib_client = lib_indexer.get_client()
        lib_indexer.init_collections(lib_client)
        stats = lib_indexer.get_stats(lib_client)
        print(f"Medical Library initialized: {stats}")
    except Exception as e:
        print(f"Warning: Could not initialize Medical Library: {e}")

    # Pre-warm medical library models on startup
    try:
        from app.domain.medical_library.embedder import get_model
        get_model()
        print("Embedding model pre-warmed")
    except Exception as e:
        print(f"Warning: Could not pre-warm embedding model: {e}")

    try:
        from app.domain.medical_library.reranker import _get_direct_reranker
        _get_direct_reranker()
        print("Reranker model pre-warmed")
    except Exception as e:
        print(f"Warning: Could not pre-warm reranker model: {e}")


@app.get("/api/health")
def health_check():
    from app.core.database import SessionLocal
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
