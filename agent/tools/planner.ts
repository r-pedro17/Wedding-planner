import { defineTool } from "eve/tools";
import { z } from "zod";
import { api, convexClient, requireWeddingId } from "../lib/convex";
import type { Id } from "../../convex/_generated/dataModel";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

const input = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("get_tasks"),
    status: z.enum(["todo", "in_progress", "done"]).optional(),
  }),
  z.object({
    action: z.literal("create_task"),
    title: z.string().min(1),
    notes: z.string().optional(),
    dueDate: dateOnly.optional(),
    owner: z.string().optional(),
  }),
  z.object({
    action: z.literal("update_task"),
    taskId: z.string().describe("The id from get_tasks."),
    title: z.string().optional(),
    notes: z.string().optional(),
    dueDate: dateOnly.optional(),
    owner: z.string().optional(),
    status: z.enum(["todo", "in_progress", "done"]).optional(),
  }),
  z.object({ action: z.literal("complete_task"), taskId: z.string() }),
  z.object({ action: z.literal("delete_task"), taskId: z.string() }),
]);

type Input = z.infer<typeof input>;

export default defineTool({
  description:
    "Read and change the wedding task list: what is open, what is overdue, and what is done. Use YYYY-MM-DD for dates; the app decides overdue/today/upcoming.",
  inputSchema: input,
  approval: ({ toolInput }) =>
    (toolInput as Input | undefined)?.action === "delete_task" ? "user-approval" : "not-applicable",
  async execute(args: Input) {
    const client = convexClient();
    const weddingId = await requireWeddingId(client);

    switch (args.action) {
      case "get_tasks": {
        const tasks = await client.query(api.tasks.list, { weddingId, status: args.status });
        return tasks.map((task) => ({
          id: task._id,
          title: task.title,
          status: task.status,
          dueDate: task.dueDate ?? null,
          dueState: task.dueState,
          owner: task.owner ?? null,
          notes: task.notes ?? null,
        }));
      }
      case "create_task": {
        const taskId = await client.mutation(api.tasks.create, {
          weddingId,
          title: args.title,
          notes: args.notes,
          dueDate: args.dueDate,
          owner: args.owner,
        });
        return { taskId, created: args.title };
      }
      case "update_task": {
        await client.mutation(api.tasks.update, {
          taskId: args.taskId as Id<"tasks">,
          title: args.title,
          notes: args.notes,
          dueDate: args.dueDate,
          owner: args.owner,
          status: args.status,
        });
        return { taskId: args.taskId, updated: true };
      }
      case "complete_task": {
        await client.mutation(api.tasks.complete, { taskId: args.taskId as Id<"tasks"> });
        return { taskId: args.taskId, status: "done" };
      }
      case "delete_task": {
        await client.mutation(api.tasks.remove, { taskId: args.taskId as Id<"tasks"> });
        return { taskId: args.taskId, deleted: true };
      }
    }
  },
});
