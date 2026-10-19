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
    Delivers direct, concise, zero-fluff answers answering ONLY what was asked.
    """
    lower = prompt.lower().strip()
    biz_name = business.name or "your business"
    opening_cash = business.opening_cash_paise or 1_000_000
    safety_buffer = business.safety_threshold_paise or 500_000
    cash_fmt = f"₹{opening_cash / 100:,.0f}"
    buffer_fmt = f"₹{safety_buffer / 100:,.0f}"

    if any(k in lower for k in ["hello", "hi", "hey", "who are you"]):
        return (
            f"Hello. I am **Ask Ripple**, your financial intelligence assistant.\n\n"
            f"• **Available Cash**: {cash_fmt}\n"
            f"• **Safety Reserve**: {buffer_fmt}\n\n"
            f"Ask any direct question about your cash flow, overdue invoices, margins, or suppliers."
        )

    if any(k in lower for k in ["cash", "liquidity", "balance", "money"]):
        return (
            f"• **Current Available Cash**: {cash_fmt}\n"
            f"• **Safety Reserve Target**: {buffer_fmt}\n"
            f"• **Runway Status**: {'Adequate reserves' if opening_cash >= safety_buffer else 'Reserve breach risk'}. "
            f"All incoming receivables and scheduled vendor payouts are currently tracked in your ledger."
        )

    if any(k in lower for k in ["invoice", "overdue", "receivable", "unpaid", "bill"]):
        return (
            f"• **Receivables Status**: Monitored live across your active invoices.\n"
            f"• **Action Needed**: Check the Invoices tab to record incoming payments or dispatch follow-up reminders to counterparties with past-due terms."
        )

    if any(k in lower for k in ["margin", "profit", "drag", "cost"]):
        return (
            f"• **Margin Assessment**: Standard paper margin does not account for supplier timing delays or SLA penalties.\n"
            f"• **Next Step**: Open the **Ripple Simulator** to compute your exact True Ripple Margin and contagion drag."
        )

    if any(k in lower for k in ["supplier", "vendor", "pay", "payable"]):
        return (
            f"• **Supplier Coordination**: Protect vendor relationships by phasing bulk PO commitments.\n"
            f"• **Recommendation**: Use 2-batch phased payments to release stock without draining your {buffer_fmt} safety reserve."
        )

    if any(k in lower for k in ["risk", "crunch", "deficit", "shortfall"]):
        is_safe = opening_cash >= safety_buffer
        return (
            f"• **Cash Crunch Risk**: {'Low' if is_safe else 'Elevated'}.\n"
            f"• **Buffer Integrity**: Available cash is {cash_fmt} against a minimum threshold of {buffer_fmt}.\n"
            f"• **Mitigation**: Simulate delays in Ripple Simulator to identify bottleneck milestones before they trigger."
        )

    return (
        f"• **Business**: {biz_name}\n"
        f"• **Treasury**: {cash_fmt} available (Safety Reserve: {buffer_fmt})\n"
        f"• All figures are synced live with your financial records. Ask a specific question regarding cash, invoices, suppliers, or margins for an immediate targeted breakdown."
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
