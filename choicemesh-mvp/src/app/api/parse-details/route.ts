import { NextResponse } from "next/server";
import { FAILURE_RESPONSES, PARSE_DETAILS_PROMPT_VERSION, parseDetails, validateReply } from "@/lib/ai/parse-details";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 10 * 60 * 1000;

function fail(failure: keyof typeof FAILURE_RESPONSES) {
  const { status, message } = FAILURE_RESPONSES[failure];
  return NextResponse.json({ error: message, code: failure }, { status });
}

export async function POST(request: Request) {
  const limit = checkRateLimit(clientKey(request), RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many analyses from this connection. Wait a moment, or fill the fields in yourself.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request.", code: "bad_request" }, { status: 400 });
  }

  const validated = validateReply((payload as { text?: unknown })?.text);
  if (!validated.ok) return fail(validated.failure);

  const result = await parseDetails(validated.text);

  // Operational logging only. The member's reply and the resulting draft are
  // never logged: they are the private data this product exists to protect.
  console.info(
    JSON.stringify({
      event: "parse_details",
      prompt_version: PARSE_DETAILS_PROMPT_VERSION,
      ok: result.ok,
      attempts: result.attempts,
      latency_ms: result.latencyMs,
      failure: result.ok ? null : result.failure
    })
  );

  if (!result.ok) return fail(result.failure);
  return NextResponse.json({ draft: result.draft });
}
