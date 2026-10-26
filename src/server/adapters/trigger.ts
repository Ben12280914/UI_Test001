import { z } from "zod";
import type { ReportType, TriggerEvent } from "@/domain/types";

/**
 * Contract of this app's inbound trigger endpoint (POST /api/triggers/webhook).
 * Power Automate (or any caller) sends this JSON with the `x-trigger-secret` header.
 * This is our own contract — it does not assume anything about Power Automate's internals.
 */
export const TriggerPayloadSchema = z.object({
  type: z.enum(["GPS_ARRIVAL", "REPORTING_SCHEDULE"]),
  occurredAt: z.string().optional(),
  reportType: z.enum(["weekly", "monthly", "quarterly", "annual"]).optional(),
  location: z.string().max(100).optional(),
  userId: z.string().max(100).optional(),
});
export type TriggerPayload = z.infer<typeof TriggerPayloadSchema>;

export interface TriggerAdapter {
  readonly name: string;
  toEvent(payload: TriggerPayload): Omit<TriggerEvent, "id" | "receivedAt"> & { reportType?: ReportType };
}

export class PowerAutomateWebhookTrigger implements TriggerAdapter {
  readonly name = "Power Automate webhook";
  toEvent(payload: TriggerPayload) {
    return {
      type: payload.type,
      source: "power_automate" as const,
      payload: { ...payload },
      reportType: payload.reportType,
    };
  }
}

/** Used by the in-app "Simulate trigger" button during demos. */
export class DemoTrigger implements TriggerAdapter {
  readonly name = "Demo simulator";
  toEvent(payload: TriggerPayload) {
    return {
      type: payload.type,
      source: "demo" as const,
      payload: { ...payload, simulated: true },
      reportType: payload.reportType,
    };
  }
}
