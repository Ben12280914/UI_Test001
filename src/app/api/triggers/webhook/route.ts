import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adapters, TriggerPayloadSchema } from "@/server/adapters";
import { triggerWebhookSecret } from "@/server/config";
import { receiveTrigger } from "@/server/workflow/triggerService";

export const dynamic = "force-dynamic";

/**
 * Inbound trigger (Power Automate HTTP action, Windows logon task, iOS Shortcut …).
 *   POST /api/triggers/webhook
 *   x-trigger-secret: <TRIGGER_WEBHOOK_SECRET>
 *   { "type": "GPS_ARRIVAL" | "REPORTING_SCHEDULE", "occurredAt"?: ISO, "reportType"?: "monthly" … }
 */
export async function POST(req: Request) {
  const secret = triggerWebhookSecret();
  if (!secret) return NextResponse.json({ ok: false, error: "Webhook is not configured (TRIGGER_WEBHOOK_SECRET)." }, { status: 503 });
  const given = Buffer.from(req.headers.get("x-trigger-secret") ?? "");
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = TriggerPayloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  const result = await receiveTrigger(adapters.webhookTrigger, parsed.data);
  return NextResponse.json({
    ok: true,
    triggerId: result.trigger.id,
    notified: result.cycles.map((c) => ({ cycleId: c.id, label: c.label, state: c.state })),
  });
}
