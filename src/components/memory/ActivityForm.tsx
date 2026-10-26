"use client";

import { ACTIVITY_STATUS_LABELS, CHANNEL_LABELS } from "@/domain/constants";
import type { ActivityStatus, Channel } from "@/domain/types";

export interface ActivityFormValue {
  activityDate: string;
  projectName: string;
  department: string;
  activityType: string;
  description: string;
  channel: Channel;
  status: ActivityStatus;
  achievement: string;
  issue: string;
  risk: string;
  nextAction: string;
}

export function ActivityForm({ value, onChange, projects }: { value: ActivityFormValue; onChange: (v: ActivityFormValue) => void; projects: string[] }) {
  const set = <K extends keyof ActivityFormValue>(k: K, v: ActivityFormValue[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div>
        <label className="label">Date</label>
        <input type="date" className="input" value={value.activityDate} onChange={(e) => set("activityDate", e.target.value)} />
      </div>
      <div>
        <label className="label">Project</label>
        <input className="input" list="known-projects" value={value.projectName} onChange={(e) => set("projectName", e.target.value)} />
        <datalist id="known-projects">
          {projects.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="label">Department</label>
        <input className="input" value={value.department} onChange={(e) => set("department", e.target.value)} />
      </div>
      <div>
        <label className="label">Activity</label>
        <input className="input" value={value.activityType} onChange={(e) => set("activityType", e.target.value)} />
      </div>
      <div>
        <label className="label">Channel</label>
        <select className="input" value={value.channel} onChange={(e) => set("channel", e.target.value as Channel)}>
          {Object.entries(CHANNEL_LABELS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Status</label>
        <select className="input" value={value.status} onChange={(e) => set("status", e.target.value as ActivityStatus)}>
          {Object.entries(ACTIVITY_STATUS_LABELS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2">
        <label className="label">Next Action</label>
        <input className="input" value={value.nextAction} onChange={(e) => set("nextAction", e.target.value)} />
      </div>
      <div className="col-span-2 md:col-span-4">
        <label className="label">Description</label>
        <textarea className="input min-h-[64px]" value={value.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="col-span-2 md:col-span-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="label">Achievement</label>
          <input className="input" value={value.achievement} onChange={(e) => set("achievement", e.target.value)} />
        </div>
        <div>
          <label className="label">Issue</label>
          <input className="input" value={value.issue} onChange={(e) => set("issue", e.target.value)} />
        </div>
        <div>
          <label className="label">Risk</label>
          <input className="input" value={value.risk} onChange={(e) => set("risk", e.target.value)} />
        </div>
      </div>
    </div>
  );
}
