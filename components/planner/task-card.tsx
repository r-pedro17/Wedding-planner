"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateOnly, type DueState } from "@/convex/lib/dates";

const dueTone: Record<DueState, BadgeTone> = {
  overdue: "bad",
  today: "warn",
  upcoming: "neutral",
  none: "neutral",
};

export function TaskCard({ task }: { task: Doc<"tasks"> & { dueState: DueState } }) {
  const complete = useMutation(api.tasks.complete);
  const update = useMutation(api.tasks.update);
  const remove = useMutation(api.tasks.remove);

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={task.status === "done" ? "font-medium text-stone-400 line-through" : "font-medium"}>
            {task.title}
          </p>
          {task.notes ? <p className="text-sm text-stone-500">{task.notes}</p> : null}
          {task.owner ? <p className="text-sm text-stone-500">Owner: {task.owner}</p> : null}
        </div>
        {task.dueDate ? (
          <Badge tone={dueTone[task.dueState]}>
            {task.dueState === "overdue" ? "overdue" : formatDateOnly(task.dueDate)}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {task.status !== "done" ? (
          <>
            <Button size="sm" onClick={() => complete({ taskId: task._id })}>
              Mark done
            </Button>
            {task.status === "todo" ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => update({ taskId: task._id, status: "in_progress" })}
              >
                Start
              </Button>
            ) : null}
          </>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => update({ taskId: task._id, status: "todo" })}>
            Reopen
          </Button>
        )}
        <Button size="sm" variant="danger" onClick={() => remove({ taskId: task._id })}>
          Delete
        </Button>
      </div>
    </Card>
  );
}
