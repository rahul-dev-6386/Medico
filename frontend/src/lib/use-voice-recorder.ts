"use client"

import { useState, useRef, useCallback } from "react"
import { getAuthHeaders } from "./utils"

const VOICE_URL = `${process.env.NEXT_PUBLIC_API_URL || "/api"}/voice/stt`

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const resolveRef = useRef<((text: string | null) => void) | null>(null)

  const startRecording = useCallback(() => {
    return new Promise<string | null>(async (resolve) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
        chunksRef.current = []
        resolveRef.current = resolve

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data)
        }

        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop())
          streamRef.current = null
          setRecording(false)

          const blob = new Blob(chunksRef.current, { type: "audio/webm" })
          chunksRef.current = []
          if (blob.size < 100) {
            resolveRef.current?.(null)
            return
          }

          setProcessing(true)
          try {
            const formData = new FormData()
            formData.append("audio", blob, "recording.webm")
            const res = await fetch(VOICE_URL, {
              method: "POST",
              headers: { ...getAuthHeaders() },
              body: formData,
            })
            if (!res.ok) throw new Error("STT failed")
            const data = await res.json()
            resolveRef.current?.(data.text || null)
          } catch {
            resolveRef.current?.(null)
          } finally {
            setProcessing(false)
            resolveRef.current = null
          }
        }

        recorder.onerror = () => {
          resolveRef.current?.(null)
          resolveRef.current = null
        }

        mediaRecorderRef.current = recorder
        recorder.start()
        setRecording(true)
      } catch {
        resolve(null)
      }
    })
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    } else {
      resolveRef.current?.(null)
      resolveRef.current = null
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  return { recording, processing, startRecording, stopRecording }
}
