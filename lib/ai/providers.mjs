import { isPublicHttpUrl } from "../ssrf-guard.mjs";
import { fetchFollowingValidatedRedirects } from "../safe-fetch.mjs";
import { getSsrfSafeDispatcher } from "../ssrf-dispatcher.mjs";

// Thin REST wrappers per AI provider — deliberately not SDKs. Each provider
// is a single fetch call with a well-documented, stable REST contract, so
// four small wrappers here are less surface area (and less version-guessing
// risk) than four separate SDKs in node_modules for what's ultimately one
// request/response each.
//
// Every wrapper returns `null` when its own API key/credentials aren't
// configured (rather than throwing) so the caller in client.mjs can treat
// "not configured" and "configured but the call failed" differently: the
// former silently skips to the next provider, the latter logs a warning.

const ANTHROPIC_TEXT_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_VISION_MODEL = "claude-haiku-4-5-20251001";
const GEMINI_MODEL = "gemini-flash-lite-latest";
const OPENROUTER_MODEL = "openai/gpt-oss-20b:free";
const CLOUDFLARE_MODEL = "@cf/meta/llama-3.1-8b-instruct";

async function readJsonOrThrow(res, providerName) {
  const bodyText = await res.text();
  let body;
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = { raw: bodyText };
  }
  if (!res.ok) {
    throw new Error(
      `${providerName} request failed (${res.status}): ${JSON.stringify(body).slice(0, 300)}`
    );
  }
  return body;
}

export async function callAnthropicText({ system, prompt, maxTokens = 300 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_TEXT_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const body = await readJsonOrThrow(res, "Anthropic");
  const text = body.content?.map(block => block.text ?? "").join("") ?? "";
  return { text, provider: "anthropic" };
}

export async function callAnthropicVision({ system, prompt, imageUrl, maxTokens = 200 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_VISION_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });
  const body = await readJsonOrThrow(res, "Anthropic");
  const text = body.content?.map(block => block.text ?? "").join("") ?? "";
  return { text, provider: "anthropic" };
}

export async function callGeminiText({ system, prompt, maxTokens = 300 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );
  const body = await readJsonOrThrow(res, "Gemini");
  const text = body.candidates?.[0]?.content?.parts?.map(p => p.text ?? "").join("") ?? "";
  return { text, provider: "gemini" };
}

export async function callGeminiVision({ system, prompt, imageUrl, maxTokens = 200 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // Gemini's REST API needs the image bytes inline (base64) — it has no
  // "fetch this arbitrary public URL" option outside its own File API,
  // which would mean a separate upload step for a one-shot moderation
  // check. Fetching and inlining is simpler for images this size.
  //
  // imageUrl ultimately comes from a post's media, so this is a fetch of
  // caller-influenced input — the same SSRF shape as the link-preview
  // fetcher in links.ts, reusing its guard: isPublicHttpUrl blocks
  // loopback/link-local/private-range targets, and
  // fetchFollowingValidatedRedirects re-checks every redirect hop (a
  // public URL that 302s to an internal address would otherwise bypass
  // the check on the initial URL alone).
  const imageRes = await fetchFollowingValidatedRedirects(imageUrl, {
    isPublicUrl: isPublicHttpUrl,
    init: { dispatcher: getSsrfSafeDispatcher() },
  });
  if (!imageRes.ok) throw new Error(`Could not fetch image for Gemini vision: ${imageRes.status}`);
  const contentType = imageRes.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await imageRes.arrayBuffer());

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [
          {
            role: "user",
            parts: [
              { inline_data: { mime_type: contentType, data: buffer.toString("base64") } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );
  const body = await readJsonOrThrow(res, "Gemini");
  const text = body.candidates?.[0]?.content?.parts?.map(p => p.text ?? "").join("") ?? "";
  return { text, provider: "gemini" };
}

export async function callOpenRouterText({ system, prompt, maxTokens = 300 }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "HTTP-Referer": "https://perfekthub.app",
      "X-Title": "Perfekthub",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      // gpt-oss-20b is a reasoning model — it spends output tokens on a
      // hidden "reasoning" trace before ever writing the final answer into
      // `content`. Confirmed live: at max_tokens:50 with no reasoning
      // param, generation hit the token cap mid-thought and `content` came
      // back null while `reasoning` had a half-finished trace. Capping
      // reasoning effort to "low" and giving it real headroom fixes that.
      max_tokens: Math.max(maxTokens, 300),
      reasoning: { effort: "low" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  const body = await readJsonOrThrow(res, "OpenRouter");
  const message = body.choices?.[0]?.message;
  // Defensive fallback for any other reasoning-capable model swapped in
  // later that still exhausts its budget on the trace.
  const text = message?.content || message?.reasoning || "";
  return { text, provider: "openrouter" };
}

export async function callCloudflareText({ system, prompt, maxTokens = 300 }) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) return null;

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CLOUDFLARE_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    }
  );
  const body = await readJsonOrThrow(res, "Cloudflare Workers AI");
  const text = body.result?.response ?? "";
  return { text, provider: "cloudflare" };
}
