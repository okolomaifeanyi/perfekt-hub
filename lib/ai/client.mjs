import {
  callAnthropicText,
  callAnthropicVision,
  callGeminiText,
  callGeminiVision,
  callOpenRouterText,
  callCloudflareText,
} from "./providers.mjs";

// Claude first (best quality), then the cheaper/free providers as backup —
// per the user's explicit ordering. Vision only lists the two providers
// that actually support it; gpt-oss-20b and llama-3.1-8b-instruct are
// text-only models, so putting them in the vision chain would just fail
// every time and waste a request before falling through.
const TEXT_PROVIDERS = [callAnthropicText, callGeminiText, callOpenRouterText, callCloudflareText];
const VISION_PROVIDERS = [callAnthropicVision, callGeminiVision];

async function runChain(providers, args) {
  const errors = [];
  for (const call of providers) {
    try {
      const result = await call(args);
      if (result) return result;
      // null means "not configured" — not an error, just try the next one.
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      console.error("AI provider call failed, trying next:", err);
    }
  }
  if (errors.length === 0) {
    throw new Error(
      "No AI provider is configured. Set ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN."
    );
  }
  throw new Error(`All AI providers failed: ${errors.join(" | ")}`);
}

/**
 * Generate a text completion, trying Claude first and falling back through
 * Gemini, OpenRouter, and Cloudflare Workers AI in order.
 */
export async function generateText({ system, prompt, maxTokens }) {
  return runChain(TEXT_PROVIDERS, { system, prompt, maxTokens });
}

/**
 * Analyze an image (e.g. for content moderation), trying Claude then
 * Gemini — the only two configured providers with vision support.
 */
export async function analyzeImage({ system, prompt, imageUrl, maxTokens }) {
  return runChain(VISION_PROVIDERS, { system, prompt, imageUrl, maxTokens });
}
