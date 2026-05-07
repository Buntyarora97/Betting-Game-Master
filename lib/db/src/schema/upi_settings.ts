import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const upiSettingsTable = pgTable("upi_settings", {
  id: serial("id").primaryKey(),
  upiId: text("upi_id").notNull(),
  qrImageUrl: text("qr_image_url"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  userRangeStart: integer("user_range_start"),
  userRangeEnd: integer("user_range_end"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUpiSettingSchema = createInsertSchema(upiSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUpiSetting = z.infer<typeof insertUpiSettingSchema>;
export type UpiSetting = typeof upiSettingsTable.$inferSelect;
