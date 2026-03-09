import cron from "node-cron";
import * as storage from "./storage";

// Run every 1 minute
cron.schedule("* * * * *", async () => {
    try {
        const todos = await storage.getTodosNeedingReminder();

        for (const todo of todos) {
            if (!todo.dueDate) continue;

            // Create a notification for the user
            await storage.createNotification({
                userId: todo.userId,
                title: "Task Reminder",
                body: `Your task "${todo.title}" is due in less than an hour.`,
                type: "status_update",
                entityType: "todo",
                entityId: todo.id,
            });

            // Mark the reminder as sent to prevent duplicate notifications
            await storage.markReminderSent(todo.id);
            console.log(`[CRON] Sent reminder for todo: ${todo.id}`);
        }
    } catch (error) {
        console.error("[CRON] Error running todo reminder check:", error);
    }
});

console.log("[CRON] Todo reminder job initialized");
