"use client";

/** Client-side call to our API routes. Throws with the server's Korean error message. */
export async function api<T = unknown>(url: string, method: "POST" | "PATCH" | "DELETE" = "POST", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  let json: { ok: boolean; data?: T; error?: string };
  try {
    json = await res.json();
  } catch {
    throw new Error(`서버 응답 오류 (${res.status})`);
  }
  if (!json.ok) throw new Error(json.error ?? "요청이 실패했습니다.");
  return json.data as T;
}
