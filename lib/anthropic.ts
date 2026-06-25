import Anthropic from "@anthropic-ai/sdk";
import { env, isAnthropicConfigured } from "@/lib/env";

/**
 * Single Anthropic client. Returns null when no API key is configured so AI
 * features can degrade gracefully (the caller shows a "configure AI" state)
 * instead of throwing.
 */
let _client: Anthropic | null | undefined;

export function getAnthropic(): Anthropic | null {
  if (_client !== undefined) return _client;
  _client = isAnthropicConfigured()
    ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY! })
    : null;
  return _client;
}

export const MODEL = env.ANTHROPIC_MODEL; // claude-sonnet-4-6 per project spec

/** Thrown when an AI feature is invoked but no ANTHROPIC_API_KEY is set. */
export class AnthropicNotConfiguredError extends Error {
  constructor() {
    super(
      "Anthropic API is not configured. Set ANTHROPIC_API_KEY in your environment.",
    );
    this.name = "AnthropicNotConfiguredError";
  }
}

/** Concatenate all text blocks from a message response. */
function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/**
 * Extract a JSON object/array from model text, tolerating ```json fences or
 * surrounding prose.
 */
function extractJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  const firstBrace = text.search(/[[{]/);
  const lastBrace = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text.trim();
}

interface CompleteOptions {
  system?: string;
  maxTokens?: number;
  /** Sampling temperature; defaults to 0 for deterministic extraction. */
  temperature?: number;
}

/** Plain text completion. Throws AnthropicNotConfiguredError if no key. */
export async function complete(
  prompt: string,
  opts: CompleteOptions = {},
): Promise<string> {
  const client = getAnthropic();
  if (!client) throw new AnthropicNotConfiguredError();

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0,
    ...(opts.system ? { system: opts.system } : {}),
    messages: [{ role: "user", content: prompt }],
  });
  return textOf(message);
}

/**
 * Completion that returns parsed JSON of type T. The prompt should instruct the
 * model to return only JSON; we still defensively extract it from any fences.
 */
export async function completeJson<T>(
  prompt: string,
  opts: CompleteOptions = {},
): Promise<T> {
  const raw = await complete(prompt, { maxTokens: 8192, ...opts });
  try {
    return JSON.parse(extractJson(raw)) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse JSON from model response: ${(err as Error).message}\n---\n${raw.slice(0, 500)}`,
    );
  }
}
