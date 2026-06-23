import io
from typing import Optional

from app.config import settings
from app.utils.gemini_client import gemini_client


class VoiceService:
    async def speech_to_text(self, audio_bytes: bytes) -> str:
        try:
            from google.cloud import speech

            client = speech.SpeechClient()
            audio = speech.RecognitionAudio(content=audio_bytes)
            config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                language_code="en-US",
            )
            response = client.recognize(config=config, audio=audio)
            if response.results:
                return response.results[0].alternatives[0].transcript
            return ""
        except Exception:
            return "Speech-to-text processing failed. Please type your message."

    async def text_to_speech(self, text: str) -> Optional[bytes]:
        try:
            from google.cloud import texttospeech

            client = texttospeech.TextToSpeechClient()
            input_text = texttospeech.SynthesisInput(text=text)
            voice = texttospeech.VoiceSelectionParams(
                language_code="en-US", name="en-US-Neural2-C"
            )
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3
            )
            response = client.synthesize_speech(
                input=input_text, voice=voice, audio_config=audio_config
            )
            return response.audio_content
        except Exception:
            return None
