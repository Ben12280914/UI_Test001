"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

/** Button that calls an API route, then refreshes server data (or navigates). Shows errors inline. */
export function ActionButton({
  url,
  method = "POST",
  body,
  children,
  className = "btn-outline",
  confirm,
  redirect,
  onDone,
  disabled,
  title,
}: {
  url: string;
  method?: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  children: ReactNode;
  className?: string;
  confirm?: string;
  redirect?: string | ((data: unknown) => string);
  onDone?: (data: unknown) => void;
  disabled?: boolean;
  title?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        className={className}
        disabled={busy || disabled}
        title={title}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          setBusy(true);
          setError(null);
          try {
            const data = await api(url, method, body);
            onDone?.(data);
            if (redirect) router.push(typeof redirect === "string" ? redirect : redirect(data));
            else router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {children}
      </button>
      {error && <span className="mt-1 max-w-xs text-xs text-brand-600">{error}</span>}
    </span>
  );
}
