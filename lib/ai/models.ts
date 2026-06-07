import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * EVA's reasoning model is a local model exposed over an OpenAI-compatible API
 * (Ollama / LM Studio / vLLM / llama.cpp, typically tunneled via ngrok).
 *
 *   LOCAL_MODEL_BASE_URL  the OpenAI-compatible base, usually ending in /v1
 *   LOCAL_MODEL_NAME      the model id the server expects
 *   LOCAL_MODEL_API_KEY   optional; most local servers ignore it
 */
export function isModelConfigured(): boolean {
  return Boolean(process.env.LOCAL_MODEL_BASE_URL);
}

export function evaModel() {
  const baseURL = process.env.LOCAL_MODEL_BASE_URL;
  if (!baseURL) {
    throw new Error(
      "LOCAL_MODEL_BASE_URL not set — point it at your local model's OpenAI-compatible base URL (usually ending in /v1)",
    );
  }
  const provider = createOpenAICompatible({
    name: "eva-local",
    baseURL,
    apiKey: process.env.LOCAL_MODEL_API_KEY || "local",
    // ngrok free tier serves an HTML interstitial without this header.
    headers: { "ngrok-skip-browser-warning": "true" },
  });
  return provider(process.env.LOCAL_MODEL_NAME || "local-model");
}
