import { pgTable, text, serial, timestamp, decimal, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gameSettingsTable = pgTable("game_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGameSettingSchema = createInsertSchema(gameSettingsTable).omit({ id: true });
export type InsertGameSetting = z.infer<typeof insertGameSettingSchema>;
export type GameSetting = typeof gameSettingsTable.$inferSelect;
