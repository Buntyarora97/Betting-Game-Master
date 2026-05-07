import { pgTable, serial, timestamp, decimal, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0"),
  totalDeposited: decimal("total_deposited", { precision: 10, scale: 2 }).notNull().default("0"),
  totalWithdrawn: decimal("total_withdrawn", { precision: 10, scale: 2 }).notNull().default("0"),
  totalWon: decimal("total_won", { precision: 10, scale: 2 }).notNull().default("0"),
  totalLost: decimal("total_lost", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWalletSchema = createInsertSchema(walletsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletsTable.$inferSelect;
