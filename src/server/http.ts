import { NextResponse } from "next/server";

/** Uniform JSON envelope for route handlers: { ok: true, data } | { ok: false, error }. */
export async function handle<T>(fn: () => Promise<T>, status = 200): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json({ ok: true, data }, { status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function jsonBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("요청 본문(JSON)이 올바르지 않습니다.");
  }
}
