import { API_BASE_URL } from "@/lib/config";
import { getAuthToken } from "@/lib/api/client";

/**
 * Google AI Studio (Gemini API) Client for Ripple AI Financial Copilot.
 * Connects via the secure backend AI proxy (/api/ai/chat) with server-side API key shielding.
 */

const LOCAL_STORAGE_KEY = "rupi_gemini_api_key";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Ordered priority list of Google AI Studio models with automatic fallback on 404/503
const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-2.5-flash",
];

export function getGeminiApiKey(): string {
  if (typeof window !== "undefined") {
    try {
      const localKey = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localKey && localKey.trim()) {
        return localKey.trim();
      }
    } catch {
      // LocalStorage access restricted
    }
  }

  // Fallback to environment variables
  const envKey =
    (import.meta as unknown as { env?: Record<string, string> }).env?.["VITE_GEMINI_API_KEY"] ||
    (typeof process !== "undefined" && process?.env?.["NEXT_PUBLIC_GEMINI_API_KEY"]) ||
    "";

  return envKey.trim();
}

export function setGeminiApiKey(key: string): void {
  if (typeof window !== "undefined") {
    try {
      if (!key || !key.trim()) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, key.trim());
      }
    } catch {
      // ignore
    }
  }
}

export function getGeminiApiKeySource(): "localStorage" | "env" | "none" {
  if (typeof window !== "undefined") {
    try {
      const localKey = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localKey && localKey.trim()) {
        return "localStorage";
      }
    } catch {
      // ignore
    }
  }

  const envKey =
    (import.meta as unknown as { env?: Record<string, string> }).env?.["VITE_GEMINI_API_KEY"] ||
    (typeof process !== "undefined" && process?.env?.["NEXT_PUBLIC_GEMINI_API_KEY"]);

  if (envKey && envKey.trim()) {
    return "env";
  }

  return "none";
}

export interface ChatMessagePart {
  role: "user" | "bot" | "model";
  text: string;
}

export interface GeminiGenerateOptions {
  prompt: string;
  systemInstruction: string;
  history?: { role: "user" | "bot"; text: string }[];
  apiKeyOverride?: string;
  preferredModel?: string;
}

export interface GeminiResponse {
  text: string;
  model: string;
  promptTokens?: number;
  candidatesTokens?: number;
}

/**
 * Call the Ripple backend AI proxy endpoint (/api/ai/chat) with server-side key shielding
 * and circuit-breaker fallback. If offline, falls back to direct client call if key available.
 */
export async function callGeminiAPI(options: GeminiGenerateOptions): Promise<GeminiResponse> {
  // 1. Try secure backend AI proxy first
  try {
    const token = getAuthToken();
    const proxyRes = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        prompt: options.prompt,
        systemInstruction: options.systemInstruction,
        history: options.history,
      }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data && data.text) {
        return {
          text: data.text,
          model: data.model || "gemini-backend-proxy",
          promptTokens: data.promptTokens,
          candidatesTokens: data.candidatesTokens,
        };
      }
    }
  } catch (proxyErr) {
    console.warn("Backend AI proxy connection failed or timed out, trying direct fallback...", proxyErr);
  }

  // 2. Direct client fallback (if user supplied local API key)
  const apiKey =
    options.apiKeyOverride !== undefined ? options.apiKeyOverride.trim() : getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Missing Gemini API Key. Provide a key or use safe offline mode.");
  }

  // Convert conversation history to Gemini contents format
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  if (options.history && options.history.length > 0) {
    for (const msg of options.history) {
      contents.push({
        role: msg.role === "bot" ? "model" : "user",
        parts: [{ text: msg.text }],
      });
    }
  }

  contents.push({
    role: "user",
    parts: [{ text: options.prompt }],
  });

  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: options.systemInstruction }],
    },
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 1200,
      topP: 0.9,
    },
  };

  const modelsToTry = options.preferredModel
    ? [options.preferredModel, ...CANDIDATE_MODELS.filter((m) => m !== options.preferredModel)]
    : CANDIDATE_MODELS;

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    const url = `${API_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorDetail = "";
        try {
          const errJson = await response.json();
          errorDetail = errJson?.error?.message || response.statusText;
        } catch {
          errorDetail = response.statusText;
        }

        // If deprecated (404) or temporarily overloaded (503), try next model candidate
        if (response.status === 404 || response.status === 503) {
          console.warn(`Gemini model ${model} returned ${response.status} (${errorDetail}), trying fallback model...`);
          lastError = new Error(`Gemini API (${model} - ${response.status}): ${errorDetail}`);
          continue;
        }

        throw new Error(`Gemini API error (${model} - ${response.status}): ${errorDetail}`);
      }

      const data = await response.json();
      const candidate = data?.candidates?.[0];
      const replyText = candidate?.content?.parts?.[0]?.text;

      if (!replyText) {
        throw new Error(`Gemini ${model} returned an empty response candidate.`);
      }

      return {
        text: replyText.trim(),
        model,
        promptTokens: data?.usageMetadata?.promptTokenCount,
        candidatesTokens: data?.usageMetadata?.candidatesTokenCount,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // If it was a network failure (fetch TypeError), don't loop endlessly through all models
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw err;
      }
    }
  }

  throw lastError || new Error("All Gemini candidate models failed to generate content.");
}
