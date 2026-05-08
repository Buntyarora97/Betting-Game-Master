import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, upiSettingsTable, usersTable, walletsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate.js";
import { logger } from "../lib/logger.js";

const router = Router();

// POST /payment/deposit-request
router.post("/payment/deposit-request", authenticate, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { amount, referenceId, screenshotUrl } = req.body;

    if (!amount || amount < 100) {
      res.status(400).json({ message: "Minimum deposit is ₹100", success: false });
      return;
    }

    if (!referenceId) {
      res.status(400).json({ message: "UTR/Reference ID is required", success: false });
      return;
    }

    const [tx] = await db.insert(transactionsTable).values({
      userId, type: "deposit", amount: String(amount), status: "pending", referenceId, screenshotUrl,
    }).returning();

    res.status(201).json({
      id: tx.id, userId: tx.userId, type: tx.type, amount: Number(tx.amount),
      status: tx.status, referenceId: tx.referenceId, screenshotUrl: tx.screenshotUrl, createdAt: tx.createdAt,
    });
  } catch (err: any) {
    logger.error({ err }, "Deposit request error");
    res.status(500).json({ message: err?.message || "Deposit failed", success: false });
  }
});

// POST /payment/withdrawal-request
router.post("/payment/withdrawal-request", authenticate, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { amount } = req.body;

    if (!amount || amount < 100) {
      res.status(400).json({ message: "Minimum withdrawal is ₹100", success: false });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user || Number(user.walletBalance) < amount) {
      res.status(400).json({ message: "Insufficient balance", success: false });
      return;
    }

    await db.update(usersTable).set({ walletBalance: sql`${usersTable.walletBalance} - ${amount}` }).where(eq(usersTable.id, userId));
    await db.update(walletsTable).set({ balance: sql`${walletsTable.balance} - ${amount}` }).where(eq(walletsTable.userId, userId));

    const [tx] = await db.insert(transactionsTable).values({
      userId, type: "withdrawal", amount: String(amount), status: "pending",
    }).returning();

    res.status(201).json({
      id: tx.id, userId: tx.userId, type: tx.type, amount: Number(tx.amount),
      status: tx.status, createdAt: tx.createdAt,
    });
  } catch (err: any) {
    logger.error({ err }, "Withdrawal request error");
    res.status(500).json({ message: err?.message || "Withdrawal failed", success: false });
  }
});

// GET /payment/upi-details
router.get("/payment/upi-details", authenticate, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const activeUpis = await db.select().from(upiSettingsTable).where(eq(upiSettingsTable.isActive, true)).orderBy(upiSettingsTable.displayOrder);

    if (activeUpis.length === 0) {
      res.json({ upiId: "payments@3batti", qrImageUrl: null, displayName: "3 Batti Payments" });
      return;
    }

    const assignedUpi = activeUpis[userId % activeUpis.length];
    res.json({
      upiId: assignedUpi.upiId,
      qrImageUrl: assignedUpi.qrImageUrl,
      displayName: `3 Batti - ${assignedUpi.upiId}`,
    });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Failed", success: false });
  }
});

export default router;
