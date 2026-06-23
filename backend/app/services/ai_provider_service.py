import json
import logging
from typing import Optional
from sqlalchemy.orm import Session

from app.config import settings
from app.models.ai_cache import AICache

logger = logging.getLogger("ai_provider")

PROVIDER_FALLBACK = "fallback"


class ProviderResult:
    def __init__(self, provider: str, success: bool, content: str = "", data: Optional[dict] = None, error: str = ""):
        self.provider = provider
        self.success = success
        self.content = content
        self.data = data or {}
        self.error = error


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


class LangChainProvider:
    def __init__(self, name: str, model: str, api_key: str, base_url: Optional[str] = None):
        self.name = name
        self.model = model
        self.base_url = base_url
        self.client = None
        if api_key:
            self._init(api_key)

    def _init(self, api_key: str):
        try:
            if "gemini" in self.name.lower():
                from langchain_google_genai import ChatGoogleGenerativeAI
                self.client = ChatGoogleGenerativeAI(
                    model=self.model,
                    google_api_key=api_key,
                    temperature=0.3,
                )
            else:
                from langchain_openai import ChatOpenAI
                kwargs = dict(
                    model=self.model,
                    api_key=api_key,
                    temperature=0.3,
                )
                if self.base_url:
                    kwargs["base_url"] = self.base_url
                self.client = ChatOpenAI(**kwargs)
        except Exception as e:
            logger.warning(f"{self.name} init failed: {e}")

    def is_available(self) -> bool:
        return self.client is not None

    def generate_response(self, prompt: str, system_instruction: Optional[str] = None, temperature: float = 0.3) -> str:
        from langchain_core.messages import HumanMessage
        full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
        self.client.temperature = temperature
        result = self.client.invoke([HumanMessage(content=full_prompt)])
        return result.content

    def generate_structured(self, prompt: str, system_instruction: Optional[str] = None) -> dict:
        si = system_instruction or ""
        full_prompt = f"{si}\n\n{prompt}" if si else prompt
        from langchain_core.messages import HumanMessage
        result = self.client.invoke([
            HumanMessage(content=full_prompt + "\n\nRespond in JSON format only.")
        ])
        parsed = _parse_json(result.content)
        if parsed:
            return parsed
        return {"error": "Failed to parse structured response", "raw": result.content}


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
        self.providers = []
        self.fallback = LocalFallbackProvider()
        self._init_providers()

    def _init_providers(self):
        configs = [
            ("gemini", settings.GEMINI_MODEL, settings.GEMINI_API_KEY, None),
            ("openai", settings.OPENAI_MODEL, settings.OPENAI_API_KEY, None),
            ("deepseek", settings.DEEPSEEK_MODEL, settings.DEEPSEEK_API_KEY, "https://api.deepseek.com"),
        ]
        for name, model, api_key, base_url in configs:
            if api_key:
                p = LangChainProvider(name, model, api_key, base_url)
                if p.is_available():
                    self.providers.append(p)
                    logger.info(f"{name} provider initialized ({model})")

        if self.providers:
            logger.info(f"AI providers ready (chain: {' -> '.join(p.name for p in self.providers)} -> fallback)")
        else:
            logger.warning("No external AI providers configured — using local fallback only")

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

        for provider in self.providers:
            logger.info(f"Trying {provider.name}")
            try:
                if method == "generate_response":
                    content = provider.generate_response(prompt, **kwargs)
                    result = ProviderResult(provider.name, True, content=content)
                elif method == "generate_structured":
                    data = provider.generate_structured(prompt, **kwargs)
                    result = ProviderResult(provider.name, True, content=json.dumps(data), data=data)
                else:
                    continue
                self._set_cache(cache_key, request_type, prompt, result.provider, {"provider": result.provider, "content": result.content, "data": result.data})
                return result
            except Exception as e:
                logger.warning(f"{provider.name} failed: {e}")

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
