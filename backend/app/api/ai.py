import os
import json
import logging
import urllib.request
import urllib.error
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_business, get_current_user
from app.models.business import Business
from app.models.user import User

logger = logging.getLogger("ripple.ai")
router = APIRouter(prefix="/api/ai", tags=["ai"])

# 6-second strict circuit breaker timeout
AI_TIMEOUT_SECONDS = 6.0

CANDIDATE_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
]

class ChatMessagePart(BaseModel):
    role: str
    text: str

class AiChatRequest(BaseModel):
    prompt: str
    systemInstruction: str | None = None
    history: list[ChatMessagePart] | None = None

def _generate_deterministic_fallback(prompt: str, business: Business) -> str:
    """
    Offline-first deterministic calculation response when external AI is unavailable or times out.
    """
    lower = prompt.lower()
    biz_name = business.name or "your business"
    opening_cash = business.opening_cash_paise or 1_000_000
    safety_buffer = business.safety_threshold_paise or 500_000

    if "cash" in lower or "liquidity" in lower or "shortfall" in lower:
        return (
            f"**Ripple Cash Flow Assessment for {biz_name}**\n\n"
            f"• **Current Usable Cash**: ₹{opening_cash / 100:,.0f}\n"
            f"• **Safety Reserve Buffer**: ₹{safety_buffer / 100:,.0f}\n"
            f"• **Status**: Active ledger events are being monitored. If customer payments delay beyond 10 days, "
            f"activate **Auto-Phase Inventory** or **Tri-Party Split-Escrow** in the Ripple Simulator to prevent buffer breaches."
        )
    elif "margin" in lower or "profit" in lower:
        return (
            f"**True Margin Reality Check for {biz_name}**\n\n"
            f"• Standard paper margin ignores timing delays and supplier penalty contagion.\n"
            f"• Each day of stalled supplier commitment incurs late fees and operational halt drag.\n"
            f"• Recommended action: Inspect the **Ripple Simulator** to measure paper vs. true ripple-adjusted margin."
        )
    elif "supplier" in lower or "vendor" in lower:
        return (
            f"**Supplier Coordination Advisory for {biz_name}**\n\n"
            f"• Safeguard critical keystone suppliers by applying 2-batch phased payments.\n"
            f"• Batch 1 releases urgent materials using verified free cash; Batch 2 synchronizes with customer receipts."
        )
    else:
        return (
            f"**Ripple Financial Intelligence for {biz_name}**\n\n"
            f"• Your cash flow loop is connected to live ledger entries and simulation models.\n"
            f"• Test hypothetical customer payment delays in the **Ripple Simulator** or add new records via the ledger."
        )

@router.post("/chat")
def chat_proxy(
    req: AiChatRequest,
    user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business),
):
    """
    Secure backend proxy for Google AI Studio Gemini API.
    Shields GEMINI_API_KEY from the client bundle.
    Enforces 6-second circuit breaker with deterministic local fallback.
    """
    gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()

    # If no key configured, immediately return deterministic local response
    if not gemini_api_key:
        return {
            "text": _generate_deterministic_fallback(req.prompt, business),
            "model": "deterministic-local-engine",
            "isFallback": True,
            "fallbackAvailable": True,
        }

    # Format payload for Gemini v1beta API
    contents = []
    if req.history:
        for m in req.history:
            api_role = "user" if m.role == "user" else "model"
            contents.append({"role": api_role, "parts": [{"text": m.text}]})
    contents.append({"role": "user", "parts": [{"text": req.prompt}]})

    request_body = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 800,
        },
    }
    if req.systemInstruction:
        request_body["system_instruction"] = {
            "parts": [{"text": req.systemInstruction}]
        }

    encoded_body = json.dumps(request_body).encode("utf-8")

    # Try candidate models with 6-second timeout circuit breaker
    last_error = None
    for model_name in CANDIDATE_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_api_key}"
        http_req = urllib.request.Request(
            url,
            data=encoded_body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(http_req, timeout=AI_TIMEOUT_SECONDS) as response:
                resp_data = json.loads(response.read().decode("utf-8"))
                candidates = resp_data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        text = parts[0].get("text", "")
                        return {
                            "text": text,
                            "model": model_name,
                            "isFallback": False,
                            "fallbackAvailable": True,
                        }
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, Exception) as exc:
            logger.warning(f"Gemini model {model_name} failed or timed out: {exc}")
            last_error = str(exc)
            continue

    # All external models failed or timed out -> return graceful deterministic fallback
    logger.info(f"AI proxy falling back to deterministic local engine (reason: {last_error})")
    return {
        "text": _generate_deterministic_fallback(req.prompt, business),
        "model": "deterministic-local-engine",
        "isFallback": True,
        "fallbackAvailable": True,
        "errorDetail": last_error,
    }
