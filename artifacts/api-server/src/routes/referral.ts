import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, referralEarningsTable, betsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

// GET /user/referrals
router.get("/user/referrals", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user.id;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  // Get all users referred by this user
  const referrals = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.referredBy, userId));

  // Get earnings
  const earnings = await db
    .select()
    .from(referralEarningsTable)
    .where(eq(referralEarningsTable.referrerId, userId));

  const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
  const pendingEarnings = earnings.filter((e) => e.status === "pending").reduce((sum, e) => sum + Number(e.amount), 0);

  const referralList = await Promise.all(
    referrals.map(async (r) => {
      const userBets = await db.select().from(betsTable).where(eq(betsTable.userId, r.id));
      const totalBets = userBets.reduce((sum, b) => sum + Number(b.amount), 0);
      const commissionEarned = earnings
        .filter((e) => e.refereeId === r.id)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      return {
        id: r.id,
        name: r.name,
        mobile: r.mobile,
        joinedAt: r.createdAt,
        totalBets,
        commissionEarned,
      };
    })
  );

  res.json({
    referralCode: user?.referralCode || "",
    totalReferrals: referrals.length,
    totalEarnings,
    pendingEarnings,
    referrals: referralList,
  });
});

export default router;
