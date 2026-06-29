import io
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

import httpx

from app.core.config import settings


SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"


class VoiceService:
    async def speech_to_text(self, audio_bytes: bytes) -> str:
        if not settings.SARVAM_API_KEY:
            return "Sarvam API key not configured."

        # Convert webm to wav (Sarvam only accepts WAV/PCM)
        wav_bytes = self._convert_to_wav(audio_bytes)
        if wav_bytes is None:
            return "Audio conversion failed."

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                files = {
                    "file": ("audio.wav", wav_bytes, "audio/wav"),
                }
                data = {
                    "model": "saaras:v3",
                    "mode": "transcribe",
                }
                headers = {
                    "api-subscription-key": settings.SARVAM_API_KEY,
                }
                resp = await client.post(
                    SARVAM_STT_URL,
                    headers=headers,
                    files=files,
                    data=data,
                )
                if resp.status_code == 200:
                    result = resp.json()
                    transcript = result.get("transcript")
                    if transcript:
                        return transcript
                    return "No transcript returned."
                return f"STT failed (HTTP {resp.status_code})"
        except Exception as e:
            return f"Speech-to-text error: {str(e)}"

    def _convert_to_wav(self, audio_bytes: bytes) -> Optional[bytes]:
        try:
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
                tmp_in.write(audio_bytes)
                tmp_in_path = tmp_in.name

            tmp_out_path = tmp_in_path.replace(".webm", ".wav")

            subprocess.run(
                [
                    "ffmpeg", "-y", "-i", tmp_in_path,
                    "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                    tmp_out_path,
                ],
                capture_output=True,
                timeout=15,
            )

            with open(tmp_out_path, "rb") as f:
                wav_bytes = f.read()

            Path(tmp_in_path).unlink(missing_ok=True)
            Path(tmp_out_path).unlink(missing_ok=True)

            return wav_bytes
        except Exception:
            return None

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
