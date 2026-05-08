import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, walletsTable, bankDetailsTable, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate.js";
import { hashPassword, comparePassword } from "../lib/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

// GET /user/profile
router.get("/user/profile", authenticate, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
      return;
    }
    res.json({
      id: user.id, name: user.name, mobile: user.mobile, email: user.email,
      referralCode: user.referralCode, kycStatus: user.kycStatus,
      isBlocked: user.isBlocked, walletBalance: Number(user.walletBalance), createdAt: user.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Failed", success: false });
  }
});

// PUT /user/profile
router.put("/user/profile", authenticate, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { name, email } = req.body;
    const [user] = await db.update(usersTable).set({ name, email }).where(eq(usersTable.id, userId)).returning();
    res.json({
      id: user.id, name: user.name, mobile: user.mobile, email: user.email,
      referralCode: user.referralCode, kycStatus: user.kycStatus,
      isBlocked: user.isBlocked, walletBalance: Number(user.walletBalance), createdAt: user.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Failed", success: false });
  }
});

// POST /user/change-mpin
router.post("/user/change-mpin", authenticate, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { oldMpin, newMpin } = req.body;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!comparePassword(oldMpin, user.mpinHash)) {
      res.status(400).json({ message: "Old MPIN is incorrect", success: false });
      return;
    }
    await db.update(usersTable).set({ mpinHash: hashPassword(newMpin) }).where(eq(usersTable.id, userId));
    res.json({ message: "MPIN changed successfully", success: true });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Failed", success: false });
  }
});

// GET /user/wallet
router.get("/user/wallet", authenticate, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId));
    if (!wallet) {
      res.json({ balance: 0, totalDeposited: 0, totalWithdrawn: 0, totalWon: 0, totalLost: 0 });
      return;
    }
    res.json({
      balance: Number(wallet.balance), totalDeposited: Number(wallet.totalDeposited),
      totalWithdrawn: Number(wallet.totalWithdrawn), totalWon: Number(wallet.totalWon), totalLost: Number(wallet.totalLost),
    });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Failed", success: false });
  }
});

// GET /user/transactions
router.get("/user/transactions", authenticate, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { page = "1", limit = "20" } = req.query as any;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId)).orderBy(desc(transactionsTable.createdAt)).limit(limitNum).offset(offset);

    res.json({
      transactions: txs.map((t) => ({
        id: t.id, userId: t.userId, type: t.type, amount: Number(t.amount),
        status: t.status, referenceId: t.referenceId, screenshotUrl: t.screenshotUrl,
        reason: t.reason, createdAt: t.createdAt,
      })),
      total: txs.length, page: pageNum, limit: limitNum,
    });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Failed", success: false });
  }
});

// GET /user/bank-details
router.get("/user/bank-details", authenticate, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const [bd] = await db.select().from(bankDetailsTable).where(eq(bankDetailsTable.userId, userId));
    res.json(bd || {});
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Failed", success: false });
  }
});

// PUT /user/bank-details
router.put("/user/bank-details", authenticate, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { accountNumber, ifsc, accountHolderName, bankName, upiId } = req.body;
    const [existing] = await db.select().from(bankDetailsTable).where(eq(bankDetailsTable.userId, userId));

    if (existing) {
      const [bd] = await db.update(bankDetailsTable).set({ accountNumber, ifsc, accountHolderName, bankName, upiId }).where(eq(bankDetailsTable.userId, userId)).returning();
      res.json(bd);
    } else {
      const [bd] = await db.insert(bankDetailsTable).values({ userId, accountNumber, ifsc, accountHolderName, bankName, upiId }).returning();
      res.json(bd);
    }
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Failed", success: false });
  }
});

export default router;
