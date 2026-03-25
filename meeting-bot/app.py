"""
Azmyra Meeting Bot Service
Handles joining Zoom meetings via SDK, capturing audio, and streaming transcription via Whisper.
"""
import os
import asyncio
import uuid
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx

app = FastAPI(title="Azmyra Meeting Bot", version="1.0.0")

WHISPER_URL = os.getenv("WHISPER_URL", "http://whisper:9000")
CALLBACK_URL = os.getenv("CALLBACK_URL", "http://app:3000/api/meetings/bot/transcript-chunk")

# In-memory session store
sessions: dict[str, dict] = {}


class JoinRequest(BaseModel):
    meetingUrl: str
    meetingId: str
    callbackUrl: Optional[str] = None
    credentials: Optional[dict] = None


class LeaveRequest(BaseModel):
    sessionId: str


@app.get("/bot/health")
async def health():
    return {"status": "ok", "service": "meeting-bot", "timestamp": datetime.utcnow().isoformat()}


@app.post("/bot/join")
async def join_meeting(req: JoinRequest):
    """
    Join a Zoom meeting.
    In production, this would use the Zoom Meeting SDK (Linux) to:
    1. Authenticate with Server-to-Server OAuth
    2. Join the meeting as "Azmyra Bot"
    3. Start audio capture (raw PCM)
    4. Stream audio chunks to Whisper for transcription
    5. POST transcript chunks to the callback URL
    """
    session_id = str(uuid.uuid4())
    callback = req.callbackUrl or CALLBACK_URL

    sessions[session_id] = {
        "id": session_id,
        "meetingId": req.meetingId,
        "meetingUrl": req.meetingUrl,
        "callbackUrl": callback,
        "status": "active",
        "joinedAt": datetime.utcnow().isoformat(),
        "transcript": "",
        "chunkCount": 0,
    }

    # TODO: In production, spawn a subprocess running the Zoom SDK bot.
    # The SDK joins as a participant, captures raw audio, sends chunks to
    # Whisper ASR, and POSTs transcribed text to the callback URL.
    #
    # For now, the service registers the session and is ready to receive
    # manual transcript-chunk pushes or Zoom webhook events.

    return {
        "sessionId": session_id,
        "status": "active",
        "message": "Bot session created. Zoom SDK integration pending.",
    }


@app.post("/bot/leave")
async def leave_meeting(req: LeaveRequest):
    """
    Leave a Zoom meeting and return the full transcript.
    """
    session = sessions.get(req.sessionId)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # TODO: In production, signal the Zoom SDK subprocess to leave the meeting.
    session["status"] = "completed"
    transcript = session.get("transcript", "")

    return {
        "sessionId": req.sessionId,
        "status": "completed",
        "transcript": transcript,
        "chunkCount": session.get("chunkCount", 0),
    }


@app.get("/bot/status/{session_id}")
async def get_status(session_id: str):
    """
    Get the current status of a bot session.
    """
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    transcript = session.get("transcript", "")
    return {
        "sessionId": session_id,
        "status": session["status"],
        "joinedAt": session.get("joinedAt"),
        "chunkCount": session.get("chunkCount", 0),
        "transcriptLength": len(transcript),
        "transcriptPreview": transcript[-500:] if len(transcript) > 500 else transcript,
    }


@app.post("/bot/transcript-push")
async def transcript_push(data: dict):
    """
    Internal endpoint: receive a transcript chunk from the Zoom SDK subprocess
    and forward it to the Next.js callback URL.
    """
    session_id = data.get("sessionId")
    chunk = data.get("chunk", "")
    if not session_id or session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]
    session["transcript"] += ("\n" if session["transcript"] else "") + chunk
    session["chunkCount"] = session.get("chunkCount", 0) + 1

    # Forward to Next.js
    callback_url = session.get("callbackUrl", CALLBACK_URL)
    try:
        async with httpx.AsyncClient() as client:
            await client.post(callback_url, json={
                "meetingId": session["meetingId"],
                "chunk": chunk,
                "timestamp": datetime.utcnow().isoformat(),
            }, timeout=5.0)
    except Exception as e:
        # Non-critical — log and continue
        print(f"[transcript-push] Failed to forward chunk: {e}")

    return {"success": True, "chunkCount": session["chunkCount"]}
