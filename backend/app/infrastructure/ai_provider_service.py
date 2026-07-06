import json
import logging
from typing import Optional, Generator
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.ai_cache import AICache

logger = logging.getLogger("ai_provider")

PROVIDER_FALLBACK = "fallback"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

OPENROUTER_MODELS = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "openai/gpt-oss-120b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
]


class ProviderResult:
    def __init__(self, provider: str, success: bool, content: str = "", data: Optional[dict] = None, error: str = "", model_used: str = ""):
        self.provider = provider
        self.success = success
        self.content = content
        self.data = data or {}
        self.error = error
        self.model_used = model_used


def _parse_json(text: str) -> Optional[dict]:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:]) if len(lines) > 1 else text[3:]
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    text = text.strip()
    if text.startswith("json"):
        text = text[4:].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


class OpenRouterProvider:
    def __init__(self, api_key: str):
        self.name = "openrouter"
        self.models = list(OPENROUTER_MODELS)
        self.client = None
        self.last_model_used = ""
        if api_key:
            from openai import OpenAI
            self.client = OpenAI(api_key=api_key, base_url=OPENROUTER_BASE_URL)
        self._latency: dict[str, float] = {}
        self._last_used: dict[str, float] = {}
        self._failures: dict[str, int] = {}
        self._total_calls = 0
        self._cooldown_until: dict[str, float] = {}

    def is_available(self) -> bool:
        return self.client is not None

    def _build_messages(self, prompt: str, system_instruction: Optional[str] = None) -> list[dict]:
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})
        return messages

    def _sort_models(self) -> list[str]:
        now = __import__("time").time()
        scored = []
        for m in self.models:
            cooldown = self._cooldown_until.get(m, 0)
            if cooldown > now:
                continue
            if m in self._latency:
                score = self._latency[m]
            else:
                score = 999.0
            scored.append((score, m))
        scored.sort(key=lambda x: x[0])
        return [m for _, m in scored]

    def _record_success(self, model: str, elapsed: float):
        now = __import__("time").time()
        if model in self._latency:
            self._latency[model] = 0.7 * self._latency[model] + 0.3 * elapsed
        else:
            self._latency[model] = elapsed
        self._last_used[model] = now
        self._failures[model] = 0
        self._total_calls += 1
        self.last_model_used = model

    def _record_failure(self, model: str, is_rate_limit: bool):
        now = __import__("time").time()
        fails = self._failures.get(model, 0) + 1
        self._failures[model] = fails
        if is_rate_limit:
            backoff = min(120, (2 ** fails) * 15)
            self._cooldown_until[model] = now + backoff
            logger.info(f"  {model} rate-limited, cooling down {backoff}s")

    def _pick_probe_model(self) -> Optional[str]:
        now = __import__("time").time()
        best = None
        best_time = float("inf")
        for m in self.models:
            cooldown = self._cooldown_until.get(m, 0)
            if cooldown > now:
                continue
            last = self._last_used.get(m, 0)
            if last < best_time:
                best_time = last
                best = m
        return best

    def generate_response(self, prompt: str, system_instruction: Optional[str] = None, temperature: float = 0.3) -> str:
        import time
        messages = self._build_messages(prompt, system_instruction)
        last_error = None
        candidates = self._sort_models()

        probe = None
        if candidates and self._total_calls > 0 and self._total_calls % 10 == 0:
            probe = self._pick_probe_model()
            if probe and probe not in candidates:
                candidates.insert(0, probe)

        for model in candidates:
            t0 = time.time()
            try:
                response = self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                )
                content = response.choices[0].message.content or ""
                elapsed = time.time() - t0
                self._record_success(model, elapsed)
                logger.info(f"  {model} responded in {elapsed:.2f}s (avg={self._latency[model]:.2f}s)")
                return content
            except Exception as e:
                elapsed = time.time() - t0
                is_429 = "429" in str(e)
                self._record_failure(model, is_429)
                logger.warning(f"  {model} failed in {elapsed:.1f}s: {e}")
                last_error = e
                continue

        raise last_error or Exception("All OpenRouter models exhausted")

    def generate_structured(self, prompt: str, system_instruction: Optional[str] = None) -> dict:
        si = system_instruction or ""
        full_prompt = f"{si}\n\n{prompt}\n\nRespond in JSON format only." if si else f"{prompt}\n\nRespond in JSON format only."
        text = self.generate_response(full_prompt, temperature=0.1)
        parsed = _parse_json(text)
        if parsed:
            return parsed
        return {"error": "Failed to parse structured response", "raw": text}

    def generate_response_stream(self, prompt: str, system_instruction: Optional[str] = None, temperature: float = 0.3):
        import time
        messages = self._build_messages(prompt, system_instruction)
        last_error = None
        candidates = self._sort_models()

        for model in candidates:
            t0 = time.time()
            try:
                response = self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    stream=True,
                )
                for chunk in response:
                    delta = chunk.choices[0].delta if chunk.choices else None
                    if delta and delta.content:
                        yield delta.content
                elapsed = time.time() - t0
                self._record_success(model, elapsed)
                logger.info(f"  {model} streamed in {elapsed:.2f}s (avg={self._latency[model]:.2f}s)")
                return
            except Exception as e:
                elapsed = time.time() - t0
                is_429 = "429" in str(e)
                self._record_failure(model, is_429)
                logger.warning(f"  {model} stream failed in {elapsed:.1f}s: {e}")
                last_error = e
                continue
        if last_error:
            raise last_error


class LocalFallbackProvider:
    def generate_response(self, prompt: str, system_instruction: Optional[str] = None, temperature: float = 0.3) -> str:
        text_lower = prompt.lower()
        if "routine" in text_lower or "daily" in text_lower or "plan" in text_lower:
            return self._routine_response(prompt)
        if "summary" in text_lower or "summarize" in text_lower:
            return self._summary_response(prompt)
        if "diagnos" in text_lower or "condition" in text_lower:
            return self._diagnosis_response(prompt)
        return self._generic_response(prompt)

    def generate_structured(self, prompt: str, system_instruction: Optional[str] = None) -> dict:
        text_lower = prompt.lower()
        if "health_score" in prompt or "risk_scores" in prompt:
            return {
                "health_score": 65,
                "risk_scores": {"diabetes": 30, "heart_disease": 25, "kidney_disease": 15, "liver_disease": 20, "hypertension": 35, "vitamin_deficiency": 40, "obesity": 25},
                "follow_up_tests": ["Complete Blood Count", "Lipid Panel", "HbA1c"],
                "abnormal_values": [],
                "timeline_events": [],
            }
        if "routine" in text_lower or "daily" in text_lower:
            return self._routine_structured()
        return {"success": True, "message": "Processed locally", "data": {}}

    def _routine_structured(self) -> dict:
        return {
            "wake_up_time": "06:30",
            "sleep_time": "22:00",
            "water_goal_ml": 2500,
            "walking_steps": 8000,
            "exercise_suggestions": ["Morning stretching 10min", "Brisk walk 30min", "Evening yoga 15min"],
            "nutrition_recommendations": ["High protein breakfast", "Include leafy greens in lunch", "Light dinner before 7pm"],
            "meal_timings": {"breakfast": "07:30", "lunch": "12:30", "dinner": "19:00"},
        }

    def _routine_response(self, prompt: str) -> str:
        return (
            "Based on your profile, here is your recommended daily routine: "
            "Wake up at 6:30 AM, start with 10 minutes of stretching. "
            "Have a protein-rich breakfast by 7:30 AM. "
            "Take a 30-minute brisk walk or light exercise mid-morning. "
            "Lunch at 12:30 PM including vegetables and lean protein. "
            "Stay hydrated with 8-10 glasses of water throughout the day. "
            "Light dinner before 7:00 PM. "
            "Wind down with 15 minutes of meditation or reading. "
            "Sleep by 10:00 PM for optimal recovery."
        )

    def _summary_response(self, prompt: str) -> str:
        lines = prompt.split("\n")
        doc_type = "Medical Report"
        for line in lines:
            if "Document type:" in line or "document_type" in line:
                parts = line.split(":", 1)
                if len(parts) > 1:
                    doc_type = parts[1].strip()
                    break
        return f"Processed {doc_type}. Analysis completed using local fallback."

    def _diagnosis_response(self, prompt: str) -> str:
        return (
            "Based on the available information, the findings suggest monitoring is needed. "
            "Please consult with a healthcare provider for a complete clinical evaluation. "
            "This is an AI-generated preliminary assessment and not a medical diagnosis."
        )

    def _generic_response(self, prompt: str) -> str:
        return (
            "I've analyzed your request using available health data. "
            "For a more detailed analysis, please provide additional context or consult your healthcare provider."
        )


class AIProviderService:
    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self.provider = None
        self.fallback = LocalFallbackProvider()
        self._init_providers()

    def _init_providers(self):
        if settings.OPENROUTER_API_KEY:
            p = OpenRouterProvider(settings.OPENROUTER_API_KEY)
            if p.is_available():
                self.provider = p
                logger.info(f"OpenRouter provider initialized with {len(p.models)} models: {p.models[0]} ... {p.models[-1]}")
                return
        logger.warning("No OpenRouter API key configured — using local fallback only")

    def _get_cache(self, cache_key: str) -> Optional[dict]:
        if not self.db:
            return None
        entry = self.db.query(AICache).filter(AICache.cache_key == cache_key).first()
        if entry:
            try:
                return json.loads(entry.response_data)
            except (json.JSONDecodeError, TypeError):
                return None
        return None

    def _set_cache(self, cache_key: str, request_type: str, prompt: str, provider: str, response_data: dict):
        if not self.db:
            return
        try:
            existing = self.db.query(AICache).filter(AICache.cache_key == cache_key).first()
            if existing:
                return
            entry = AICache(
                cache_key=cache_key,
                request_type=request_type,
                prompt=prompt[:500],
                provider=provider,
                response_data=json.dumps(response_data),
            )
            self.db.add(entry)
            self.db.commit()
        except Exception:
            self.db.rollback()

    def _execute(self, request_type: str, method: str, prompt: str, system_instruction: Optional[str] = None, temperature: float = 0.3, use_cache: bool = True) -> ProviderResult:
        cache_key = AICache.make_key(request_type, prompt, system_instruction or "")
        if use_cache:
            cached = self._get_cache(cache_key)
            if cached:
                logger.info(f"Cache hit for {request_type}")
                return ProviderResult(cached.get("provider", "cache"), True, content=cached.get("content", ""), data=cached.get("data", {}))

        kwargs = {"system_instruction": system_instruction}
        if method == "generate_response":
            kwargs["temperature"] = temperature

        if self.provider:
            logger.info(f"Trying OpenRouter")
            try:
                model_used = ""
                if method == "generate_response":
                    content = self.provider.generate_response(prompt, **kwargs)
                    model_used = getattr(self.provider, "last_model_used", "")
                    result = ProviderResult(self.provider.name, True, content=content, model_used=model_used)
                elif method == "generate_structured":
                    data = self.provider.generate_structured(prompt, **kwargs)
                    model_used = getattr(self.provider, "last_model_used", "")
                    result = ProviderResult(self.provider.name, True, content=json.dumps(data), data=data, model_used=model_used)
                else:
                    result = ProviderResult(PROVIDER_FALLBACK, False, content="", error=f"Unknown method: {method}")
                self._set_cache(cache_key, request_type, prompt, result.provider, {"provider": result.provider, "content": result.content, "data": result.data})
                return result
            except Exception as e:
                logger.warning(f"OpenRouter failed: {e}")

        logger.info("Using local fallback")
        try:
            if method == "generate_response":
                content = self.fallback.generate_response(prompt, **kwargs)
                result = ProviderResult(PROVIDER_FALLBACK, True, content=content)
            elif method == "generate_structured":
                data = self.fallback.generate_structured(prompt, **kwargs)
                result = ProviderResult(PROVIDER_FALLBACK, True, content=json.dumps(data), data=data)
            else:
                result = ProviderResult(PROVIDER_FALLBACK, False, content="", error=f"Unknown method: {method}")
            self._set_cache(cache_key, request_type, prompt, result.provider, {"provider": result.provider, "content": result.content, "data": result.data})
            return result
        except Exception as e:
            return ProviderResult(PROVIDER_FALLBACK, False, content="", error=str(e))

    def generate_response(self, prompt: str, system_instruction: Optional[str] = None, temperature: float = 0.3) -> str:
        result = self._execute("generate_response", "generate_response", prompt, system_instruction, temperature)
        if not result.success:
            return "AI temporarily unavailable. Please try again later."
        return result.content

    def generate_structured(self, prompt: str, system_instruction: Optional[str] = None) -> dict:
        result = self._execute("generate_structured", "generate_structured", prompt, system_instruction)
        if not result.success:
            return {"success": False, "error": "AI temporarily unavailable"}
        if result.data:
            return result.data
        try:
            return json.loads(result.content)
        except (json.JSONDecodeError, TypeError):
            return {"success": False, "error": "Failed to parse response"}

    def generate_medical_analysis(self, report_text: str, document_type: str) -> dict:
        prompt = (
            f"Analyze this {document_type} and extract all medical information.\n\n"
            f"Document text:\n{report_text[:5000]}"
        )
        return self.generate_structured(prompt, system_instruction="You are a medical document analyzer. Extract structured data in JSON.")

    def generate_chat_response(self, message: str, context: str, system_instruction: Optional[str] = None) -> str:
        si = system_instruction or "You are a helpful AI health assistant. Be concise and accurate."
        prompt = f"{context}\n\nUser: {message}\n\nAssistant:"
        return self.generate_response(prompt, system_instruction=si)

    def _execute_stream(self, prompt: str, system_instruction: Optional[str] = None, temperature: float = 0.3):
        if self.provider:
            try:
                logger.info("Streaming from OpenRouter")
                yield from self.provider.generate_response_stream(prompt, system_instruction=system_instruction, temperature=temperature)
                return
            except Exception as e:
                logger.warning(f"OpenRouter stream failed: {e}")
        logger.info("Stream fallback to local")
        yield self.fallback.generate_response(prompt, system_instruction=system_instruction)

    def generate_chat_response_stream(self, message: str, context: str, system_instruction: Optional[str] = None):
        si = system_instruction or "You are a helpful AI health assistant. Be concise and accurate."
        prompt = f"{context}\n\nUser: {message}\n\nAssistant:"
        yield from self._execute_stream(prompt, system_instruction=si)

    def generate_daily_routine(self, patient_context: str) -> dict:
        prompt = (
            f"Based on this patient profile, generate a personalized daily health routine.\n\n"
            f"Patient Context:\n{patient_context}\n\n"
            f"Generate a daily plan with: wake_up_time, sleep_time, water_goal_ml, "
            f"walking_steps, exercise_suggestions (array), nutrition_recommendations (array), "
            f"meal_timings (object with breakfast, lunch, dinner). Respond in JSON."
        )
        return self.generate_structured(prompt, system_instruction="You are a health routine generator.")


ai_provider = AIProviderService()
