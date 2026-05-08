import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, referralEarningsTable, betsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate.js";
import { logger } from "../lib/logger.js";

const router = Router();

// GET /user/referrals
router.get("/user/referrals", authenticate, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

    const referrals = await db.select().from(usersTable).where(eq(usersTable.referredBy, userId));
    const earnings = await db.select().from(referralEarningsTable).where(eq(referralEarningsTable.referrerId, userId));

    const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
    const pendingEarnings = earnings.filter((e) => e.status === "pending").reduce((sum, e) => sum + Number(e.amount), 0);

    const referralList = await Promise.all(
      referrals.map(async (r) => {
        const userBets = await db.select().from(betsTable).where(eq(betsTable.userId, r.id));
        const totalBets = userBets.reduce((sum, b) => sum + Number(b.amount), 0);
        const commissionEarned = earnings.filter((e) => e.refereeId === r.id).reduce((sum, e) => sum + Number(e.amount), 0);
        return { id: r.id, name: r.name, mobile: r.mobile, joinedAt: r.createdAt, totalBets, commissionEarned };
      })
    );

    res.json({
      referralCode: user?.referralCode || "",
      totalReferrals: referrals.length,
      totalEarnings,
      pendingEarnings,
      referrals: referralList,
    });
  } catch (err: any) {
    logger.error({ err }, "Referrals error");
    res.status(500).json({ message: err?.message || "Failed", success: false });
  }
});

export default router;
