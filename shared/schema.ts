import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const commandSchema = z.object({
  _id: z.string().optional(),
  transcript: z.string(),
  timestamp: z.date(),
  agentResponses: z.array(z.object({
    role: z.string(),
    message: z.string()
  }))
});

export const insertCommandSchema = commandSchema.omit({ _id: true });

export type Command = z.infer<typeof commandSchema>;
export type InsertCommand = z.infer<typeof insertCommandSchema>;
