/**
 * The private-draft extraction call.
 *
 * Kept separate from the route handler so the same code path is exercised by
 * the evaluation harness and by unit tests. The route owns HTTP concerns
 * (rate limiting, status codes); this module owns the model contract.
 */

import { isDetailDraft, type DetailDraft } from "../details";
import { PARSE_DETAILS_PROMPT_VERSION, parseDetailsSystemPrompt } from "./parse-details-prompt";

export const MAX_REPLY_LENGTH = 2000;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 2;

export type ParseFailure =
  | "not_configured"
  | "empty_input"
  | "input_too_long"
  | "timeout"
  | "upstream_error"
  | "unusable_response";

export type ParseResult =
  | { ok: true; draft: DetailDraft; attempts: number; latencyMs: number }
  | { ok: false; failure: ParseFailure; attempts: number; latencyMs: number };

export function validateReply(text: unknown): { ok: true; text: string } | { ok: false; failure: ParseFailure } {
  if (typeof text !== "string") return { ok: false, failure: "empty_input" };
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, failure: "empty_input" };
  if (trimmed.length > MAX_REPLY_LENGTH) return { ok: false, failure: "input_too_long" };
  return { ok: true, text: trimmed };
}

async function callModel(apiKey: string, text: string, strict: boolean): Promise<{ status: number; content: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        temperature: 0,
        max_tokens: 380,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: parseDetailsSystemPrompt },
          {
            role: "user",
            content: strict
              // The retry restates the contract rather than resending the same
              // request, because a malformed first response is usually a
              // schema problem, not a transient one.
              ? `Extract private details from this reply. Return ONLY the JSON object with exactly the required keys and no commentary:\n${text}`
              : `Extract private details from this reply:\n${text}`
          }
        ]
      }),
      cache: "no-store",
      signal: controller.signal
    });
    const result = (await response.json().catch(() => null)) as
      | { choices?: Array<{ message?: { content?: string | null } }> }
      | null;
    return { status: response.status, content: result?.choices?.[0]?.message?.content ?? null };
  } finally {
    clearTimeout(timer);
  }
}

export async function parseDetails(text: string): Promise<ParseResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const startedAt = Date.now();
  if (!apiKey) return { ok: false, failure: "not_configured", attempts: 0, latencyMs: 0 };

  let lastFailure: ParseFailure = "upstream_error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const { status, content } = await callModel(apiKey, text, attempt > 1);

      if (status === 429 || status >= 500) {
        lastFailure = "upstream_error";
        continue;
      }
      if (status >= 400) {
        return { ok: false, failure: "upstream_error", attempts: attempt, latencyMs: Date.now() - startedAt };
      }
      if (!content) {
        lastFailure = "unusable_response";
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        lastFailure = "unusable_response";
        continue;
      }

      if (!isDetailDraft(parsed)) {
        lastFailure = "unusable_response";
        continue;
      }

      return { ok: true, draft: parsed, attempts: attempt, latencyMs: Date.now() - startedAt };
    } catch (error) {
      lastFailure = error instanceof Error && error.name === "AbortError" ? "timeout" : "upstream_error";
    }
  }

  return { ok: false, failure: lastFailure, attempts: MAX_ATTEMPTS, latencyMs: Date.now() - startedAt };
}

export const FAILURE_RESPONSES: Record<ParseFailure, { status: number; message: string }> = {
  not_configured: { status: 503, message: "The private-draft analysis is not configured on this deployment." },
  empty_input: { status: 400, message: "Say or type a short reply first." },
  input_too_long: { status: 400, message: `Keep your reply under ${MAX_REPLY_LENGTH} characters.` },
  timeout: { status: 504, message: "The analysis took too long. Try again, or fill the fields in yourself." },
  upstream_error: { status: 502, message: "The analysis service is unavailable right now. Try again, or fill the fields in yourself." },
  unusable_response: { status: 502, message: "We could not turn that reply into a draft. Try rephrasing, or fill the fields in yourself." }
};

export { PARSE_DETAILS_PROMPT_VERSION };
