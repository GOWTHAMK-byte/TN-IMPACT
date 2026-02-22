import type { Express } from "express";
import { createServer, type Server } from "node:http";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import leaveRoutes from "./routes/leaves";
import ticketRoutes from "./routes/tickets";
import expenseRoutes from "./routes/expenses";
import notificationRoutes from "./routes/notifications";
import searchRoutes from "./routes/search";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/leaves", leaveRoutes);
  app.use("/api/tickets", ticketRoutes);
  app.use("/api/expenses", expenseRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/search", searchRoutes);

  const httpServer = createServer(app);

  return httpServer;
}
