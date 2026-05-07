import { pgTable, text, serial, timestamp, decimal, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const referralEarningsTable = pgTable("referral_earnings", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),
  refereeId: integer("referee_id").notNull(),
  type: text("type").notNull(), // signup, bet
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, paid
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReferralEarningSchema = createInsertSchema(referralEarningsTable).omit({ id: true, createdAt: true });
export type InsertReferralEarning = z.infer<typeof insertReferralEarningSchema>;
export type ReferralEarning = typeof referralEarningsTable.$inferSelect;
