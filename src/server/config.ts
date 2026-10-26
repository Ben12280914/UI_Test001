import path from "node:path";

// Central place for environment configuration. Values come from .env / .env.local only.

export type AiMode = "live" | "demo";

export function dataDir(): string {
  return path.resolve(process.env.DATA_DIR || "./data");
}

export function aiConfig() {
  const requested: AiMode = process.env.AI_MODE === "demo" ? "demo" : "live";
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  const mode: AiMode = requested === "live" && hasKey ? "live" : "demo";
  return {
    requested,
    mode,
    hasKey,
    model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
    fallbacks: process.env.ANTHROPIC_FALLBACKS === "off" ? "off" : "default",
    proxy: process.env.LLM_HTTPS_PROXY || undefined,
    fellBackToDemo: requested === "live" && !hasKey,
  } as const;
}

export function triggerWebhookSecret(): string | undefined {
  return process.env.TRIGGER_WEBHOOK_SECRET || undefined;
}
