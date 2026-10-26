"use client";

import { CalendarClock, MapPin } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";

/** Demo stand-in for Step 01. Real triggers arrive at POST /api/triggers/webhook. */
export function TriggerSimulator() {
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton url="/api/triggers/simulate" body={{ type: "GPS_ARRIVAL", location: "본사 정문 (demo)" }} className="btn-navy btn-sm">
        <MapPin className="h-3.5 w-3.5" /> GPS 출근 Trigger 시뮬레이션
      </ActionButton>
      <ActionButton url="/api/triggers/simulate" body={{ type: "REPORTING_SCHEDULE" }} className="btn-outline btn-sm">
        <CalendarClock className="h-3.5 w-3.5" /> 보고 일정 Trigger
      </ActionButton>
    </div>
  );
}
