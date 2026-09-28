"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cx, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { isTaskDone, taskAssignee, taskDueDate, taskTitle } from "./helpers";
import type { ChecklistTask } from "./types";

/** Satu baris tugas checklist: checkbox native + label judul + info + badge selesai. */
export function TaskRow({
  task,
  onToggle,
  toggling,
}: {
  task: ChecklistTask;
  onToggle: (task: ChecklistTask) => void;
  toggling: boolean;
}) {
  const done = isTaskDone(task);
  const id = React.useId();
  const assignee = taskAssignee(task);
  const due = taskDueDate(task);

  return (
    <li className="flex items-start gap-3 rounded-control border border-border bg-surface px-3 py-3">
      <input
        id={id}
        type="checkbox"
        checked={done}
        disabled={done || toggling}
        onChange={() => onToggle(task)}
        className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer accent-accent disabled:cursor-default"
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={id}
          className={cx(
            "cursor-pointer text-sm font-medium text-text",
            done && "cursor-default text-text-tertiary line-through",
          )}
        >
          {taskTitle(task)}
        </label>
        {(assignee || due) && (
          <p className="mt-0.5 text-xs text-text-secondary">
            {assignee && <span>Penanggung jawab: {assignee}</span>}
            {assignee && due && <span aria-hidden> · </span>}
            {due && <span>Tenggat: {formatDate(due)}</span>}
          </p>
        )}
      </div>
      {done ? (
        <Badge variant="success" className="shrink-0">
          Selesai
        </Badge>
      ) : (
        toggling && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-text-tertiary" aria-hidden />
        )
      )}
    </li>
  );
}
