import re
from typing import Any

# Match script, iframe, object, embed, style, svg tags and their internal contents
SCRIPT_TAG_RE = re.compile(r"<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>", re.IGNORECASE)
DANGEROUS_BLOCKS_RE = re.compile(r"<(iframe|object|embed|style|svg)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>", re.IGNORECASE)

# Match any remaining HTML tags
HTML_TAG_RE = re.compile(r"<[^>]+>")

# Match javascript: pseudo-protocols
JAVASCRIPT_URI_RE = re.compile(r"javascript\s*:", re.IGNORECASE)

# Match inline event handlers (e.g. onerror=, onload=, onclick=)
EVENT_HANDLER_RE = re.compile(r"\bon\w+\s*=", re.IGNORECASE)


def sanitize_string(value: str) -> str:
    """
    Sanitizes string inputs to prevent Stored XSS and HTML injection:
    - Strips <script> tags and all executable code inside them.
    - Strips dangerous HTML blocks (iframe, object, embed, svg, style).
    - Strips inline event handlers (onerror, onload, etc.) and javascript: URIs.
    - Strips residual HTML markup while preserving legitimate textual content.
    """
    if not isinstance(value, str):
        return value

    cleaned = SCRIPT_TAG_RE.sub("", value)
    cleaned = DANGEROUS_BLOCKS_RE.sub("", cleaned)
    cleaned = JAVASCRIPT_URI_RE.sub("", cleaned)
    cleaned = EVENT_HANDLER_RE.sub("", cleaned)
    cleaned = HTML_TAG_RE.sub("", cleaned)
    return cleaned.strip()


def sanitize_payload(obj: Any) -> Any:
    """
    Recursively sanitize all string values in dictionaries, lists, or primitive types.
    """
    if isinstance(obj, str):
        return sanitize_string(obj)
    elif isinstance(obj, dict):
        return {k: sanitize_payload(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_payload(v) for v in obj]
    return obj
