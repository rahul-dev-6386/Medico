import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted
from typing import Optional
import json
import time

from app.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)


TEXT_MODEL = "models/gemini-2.5-flash"
VISION_MODEL = "models/gemini-2.5-flash-image"
EMBEDDING_MODEL = "models/gemini-embedding-001"


class GeminiClient:
    def __init__(self):
        self.model = genai.GenerativeModel(TEXT_MODEL)
        self.vision_model = genai.GenerativeModel(VISION_MODEL)

    def _call_with_retry(self, func, *args, max_retries=3, **kwargs):
        for attempt in range(max_retries):
            try:
                return func(*args, **kwargs)
            except ResourceExhausted as e:
                if attempt < max_retries - 1:
                    sleep_time = (2 ** attempt) * 5
                    time.sleep(sleep_time)
                else:
                    raise
            except Exception:
                raise

    def generate_response(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
    ) -> str:
        full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
        response = self._call_with_retry(
            self.model.generate_content,
            full_prompt,
            generation_config=genai.types.GenerationConfig(temperature=temperature),
        )
        return response.text

    def generate_stream(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
    ):
        full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
        response = self.model.generate_content(
            full_prompt,
            stream=True,
            generation_config=genai.types.GenerationConfig(temperature=temperature),
        )
        for chunk in response:
            if chunk.text:
                yield chunk.text

    def analyze_image(self, image_data: bytes, prompt: str) -> str:
        import PIL.Image
        import io

        image = PIL.Image.open(io.BytesIO(image_data))
        response = self.vision_model.generate_content([prompt, image])
        return response.text

    def generate_structured(self, prompt: str, system_instruction: Optional[str] = None) -> dict:
        full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
        response = self._call_with_retry(
            self.model.generate_content,
            full_prompt + "\n\nRespond in JSON format only.",
            generation_config=genai.types.GenerationConfig(temperature=0.3),
        )
        return self._parse_json(response.text)

    def _parse_json(self, text: str) -> dict:
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {"error": "Failed to parse structured response", "raw": text}

    def create_embedding(self, text: str) -> list[float]:
        result = genai.embed_content(model=EMBEDDING_MODEL, content=text)
        return result["embedding"]


gemini_client = GeminiClient()
