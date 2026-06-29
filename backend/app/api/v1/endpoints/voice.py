from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel

from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.services.voice_service import VoiceService

router = APIRouter(prefix="/api/voice", tags=["Voice Assistant"])


class TTSRequest(BaseModel):
    text: str


@router.post("/stt")
async def speech_to_text(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    service = VoiceService()
    audio_bytes = await audio.read()
    text = await service.speech_to_text(audio_bytes)
    return {"text": text}


@router.post("/tts")
async def text_to_speech(
    data: TTSRequest,
    current_user: User = Depends(get_current_user),
):
    service = VoiceService()
    audio_content = await service.text_to_speech(data.text)
    if not audio_content:
        raise HTTPException(status_code=500, detail="Text-to-speech conversion failed")
    return Response(content=audio_content, media_type="audio/mpeg")
