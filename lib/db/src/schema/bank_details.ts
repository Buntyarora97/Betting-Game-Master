import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bankDetailsTable = pgTable("bank_details", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  accountNumber: text("account_number"),
  ifsc: text("ifsc"),
  accountHolderName: text("account_holder_name"),
  bankName: text("bank_name"),
  upiId: text("upi_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBankDetailSchema = createInsertSchema(bankDetailsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBankDetail = z.infer<typeof insertBankDetailSchema>;
export type BankDetail = typeof bankDetailsTable.$inferSelect;
