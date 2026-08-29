"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWedding } from "@/components/use-wedding";
import { AddTaskForm } from "@/components/planner/add-task-form";
import { TaskCard } from "@/components/planner/task-card";
import { VendorList } from "@/components/planner/vendor-list";
import { EmptyState } from "@/components/ui/empty-state";
import { CardTitle } from "@/components/ui/card";

export default function PlannerPage() {
  const wedding = useWedding();
  const tasks = useQuery(api.tasks.list, wedding ? { weddingId: wedding._id } : "skip");

  if (wedding === undefined) return <p className="text-stone-500">Loading…</p>;
  if (wedding === null) return <EmptyState title="Create your wedding in Settings first" />;

  const open = tasks?.filter((task) => task.status !== "done") ?? [];
  const done = tasks?.filter((task) => task.status === "done") ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Planner</h1>
      <AddTaskForm weddingId={wedding._id} />

      <section className="space-y-3">
        <CardTitle>To do</CardTitle>
        {tasks === undefined ? <p className="text-sm text-stone-500">Loading…</p> : null}
        {tasks !== undefined && open.length === 0 ? <EmptyState title="Nothing open. Enjoy the calm." /> : null}
        {open.map((task) => (
          <TaskCard key={task._id} task={task} />
        ))}
      </section>

      {done.length > 0 ? (
        <section className="space-y-3">
          <CardTitle>Done</CardTitle>
          {done.map((task) => (
            <TaskCard key={task._id} task={task} />
          ))}
        </section>
      ) : null}

      <VendorList weddingId={wedding._id} />
    </div>
  );
}
