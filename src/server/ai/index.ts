import { AsyncLocalStorage } from "node:async_hooks";
import { aiConfig } from "../config";
import { ClaudeEngine } from "./claudeEngine";
import type { AiEngine } from "./engine";
import { RuleEngine } from "./ruleEngine";

export * from "./engine";

const rule = new RuleEngine();
let claude: ClaudeEngine | null = null;

const override = new AsyncLocalStorage<AiEngine>();

/** Run `fn` with the rule engine regardless of AI_MODE (used for demo data seeding). */
export function withRuleEngine<T>(fn: () => Promise<T>): Promise<T> {
  return override.run(rule, fn);
}

/** Live Claude engine when configured, otherwise the deterministic demo engine. */
export function getEngine(): AiEngine {
  const forced = override.getStore();
  if (forced) return forced;
  if (aiConfig().mode === "live") {
    claude ??= new ClaudeEngine();
    return claude;
  }
  return rule;
}

