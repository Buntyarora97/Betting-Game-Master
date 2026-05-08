import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  walletsTable,
  transactionsTable,
  gamesTable,
  betsTable,
  upiSettingsTable,
  adminUsersTable,
  auditLogsTable,
  referralEarningsTable,
  gameSettingsTable,
} from "@workspace/db";
import { eq, desc, sql, like, and, gte, lte } from "drizzle-orm";
import { authenticateAdmin } from "../middlewares/authenticate.js";

const router = Router();

async function logAudit(adminId: number, action: string, details?: string, ip?: string) {
  await db.insert(auditLogsTable).values({ adminId, action, details, ipAddress: ip });
}

// GET /admin/dashboard
router.get("/admin/dashboard", authenticateAdmin, async (req, res): Promise<void> => {
  const adminId = (req as any).admin.id;

  const [totalUsersResult] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [walletResult] = await db.select({ total: sql<number>`sum(wallet_balance)` }).from(usersTable);

  // Today's stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTxs = await db
    .select()
    .from(transactionsTable)
    .where(gte(transactionsTable.createdAt, today));

  const todayDeposits = todayTxs.filter((t) => t.type === "deposit" && t.status === "approved");
  const todayCollection = todayTxs.filter((t) => t.type === "bet").reduce((s, t) => s + Number(t.amount), 0);

  const [pendingDepositsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.type, "deposit"), eq(transactionsTable.status, "pending")));

  const [pendingWithdrawalsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.type, "withdrawal"), eq(transactionsTable.status, "pending")));

  // Weekly stats
  const weeklyStats = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);

    const dayTxs = await db
      .select()
      .from(transactionsTable)
      .where(and(gte(transactionsTable.createdAt, day), lte(transactionsTable.createdAt, nextDay)));

    const dayCollection = dayTxs.filter((t) => t.type === "bet").reduce((s, t) => s + Number(t.amount), 0);
    const dayPayout = dayTxs.filter((t) => t.type === "win").reduce((s, t) => s + Number(t.amount), 0);

    const [dayUsers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(usersTable)
      .where(and(gte(usersTable.createdAt, day), lte(usersTable.createdAt, nextDay)));

    weeklyStats.push({
      date: day.toISOString().split("T")[0],
      collection: dayCollection,
      payout: dayPayout,
      users: Number(dayUsers?.count || 0),
    });
  }

  // Upcoming game
  const istOffset = 5.5 * 60 * 60 * 1000;
  const now = new Date();
  const istNow = new Date(now.getTime() + istOffset);
  const GAME_HOURS = [9, 13, 17, 21];
  let nextGameIST = null;
  for (const h of GAME_HOURS) {
    if (h > istNow.getUTCHours()) {
      nextGameIST = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), h, 0, 0) - istOffset);
      break;
    }
  }
  if (!nextGameIST) {
    nextGameIST = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() + 1, 9, 0, 0) - istOffset);
  }

  const todayPayout = todayTxs.filter((t) => t.type === "win").reduce((s, t) => s + Number(t.amount), 0);

  res.json({
    totalUsers: Number(totalUsersResult?.count || 0),
    todayNewUsers: 0,
    totalWalletBalance: Number(walletResult?.total || 0),
    todayCollection,
    todayPayout,
    todayProfit: todayCollection - todayPayout,
    pendingDeposits: Number(pendingDepositsResult?.count || 0),
    pendingWithdrawals: Number(pendingWithdrawalsResult?.count || 0),
    upcomingGameAt: nextGameIST.toISOString(),
    weeklyStats,
  });
});

// GET /admin/users
router.get("/admin/users", authenticateAdmin, async (req, res): Promise<void> => {
  const { search, page = "1", limit = "20" } = req.query as any;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  let query = db.select().from(usersTable);
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);

  res.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      mobile: u.mobile,
      email: u.email,
      referralCode: u.referralCode,
      kycStatus: u.kycStatus,
      isBlocked: u.isBlocked,
      walletBalance: Number(u.walletBalance),
      createdAt: u.createdAt,
    })),
    total: Number(totalResult?.count || 0),
    page: pageNum,
  });
});

// GET /admin/users/:userId
router.get("/admin/users/:userId", authenticateAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ message: "User not found", success: false });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId));
  const recentBets = await db.select().from(betsTable).where(eq(betsTable.userId, userId)).orderBy(desc(betsTable.createdAt)).limit(10);
  const recentTxs = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId)).orderBy(desc(transactionsTable.createdAt)).limit(10);

  res.json({
    user: {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      referralCode: user.referralCode,
      kycStatus: user.kycStatus,
      isBlocked: user.isBlocked,
      walletBalance: Number(user.walletBalance),
      createdAt: user.createdAt,
    },
    wallet: wallet ? {
      balance: Number(wallet.balance),
      totalDeposited: Number(wallet.totalDeposited),
      totalWithdrawn: Number(wallet.totalWithdrawn),
      totalWon: Number(wallet.totalWon),
      totalLost: Number(wallet.totalLost),
    } : { balance: 0, totalDeposited: 0, totalWithdrawn: 0, totalWon: 0, totalLost: 0 },
    recentBets: recentBets.map((b) => ({
      id: b.id, userId: b.userId, gameId: b.gameId, betType: b.betType,
      selection: b.selection, amount: Number(b.amount), potentialWin: Number(b.potentialWin),
      status: b.status, createdAt: b.createdAt,
    })),
    recentTransactions: recentTxs.map((t) => ({
      id: t.id, userId: t.userId, type: t.type, amount: Number(t.amount),
      status: t.status, referenceId: t.referenceId, screenshotUrl: t.screenshotUrl,
      reason: t.reason, createdAt: t.createdAt,
    })),
  });
});

// PUT /admin/users/:userId
router.put("/admin/users/:userId", authenticateAdmin, async (req, res): Promise<void> => {
  const adminId = (req as any).admin.id;
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);
  const { isBlocked, kycStatus } = req.body;

  await db.update(usersTable).set({ isBlocked, kycStatus }).where(eq(usersTable.id, userId));
  await logAudit(adminId, "update_user", `User ${userId} updated: blocked=${isBlocked}, kyc=${kycStatus}`, req.ip);

  res.json({ message: "User updated", success: true });
});

// PUT /admin/users/:userId/wallet
router.put("/admin/users/:userId/wallet", authenticateAdmin, async (req, res): Promise<void> => {
  const adminId = (req as any).admin.id;
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);
  const { type, amount, reason } = req.body;

  if (type === "credit") {
    await db.update(usersTable).set({
      walletBalance: sql`${usersTable.walletBalance} + ${amount}`,
    }).where(eq(usersTable.id, userId));
    await db.update(walletsTable).set({
      balance: sql`${walletsTable.balance} + ${amount}`,
    }).where(eq(walletsTable.userId, userId));
  } else {
    await db.update(usersTable).set({
      walletBalance: sql`${usersTable.walletBalance} - ${amount}`,
    }).where(eq(usersTable.id, userId));
    await db.update(walletsTable).set({
      balance: sql`${walletsTable.balance} - ${amount}`,
    }).where(eq(walletsTable.userId, userId));
  }

  await db.insert(transactionsTable).values({
    userId,
    type: type === "credit" ? "bonus" : "bet",
    amount: String(amount),
    status: "completed",
    reason,
  });

  await logAudit(adminId, "wallet_adjust", `User ${userId} wallet ${type} ₹${amount}: ${reason}`, req.ip);
  res.json({ message: "Wallet adjusted", success: true });
});

// GET /admin/games
router.get("/admin/games", authenticateAdmin, async (req, res): Promise<void> => {
  const { page = "1" } = req.query as any;
  const pageNum = parseInt(page, 10);
  const limit = 20;
  const offset = (pageNum - 1) * limit;

  const games = await db
    .select()
    .from(gamesTable)
    .orderBy(desc(gamesTable.scheduledAt))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(gamesTable);

  res.json({
    games: games.map((g) => ({
      id: g.id,
      scheduledAt: g.scheduledAt,
      status: g.status,
      winningColor: g.winningColor,
      winningNumber: g.winningNumber,
      totalCollection: Number(g.totalCollection),
      totalPayout: Number(g.totalPayout),
      createdAt: g.createdAt,
    })),
    total: Number(totalResult?.count || 0),
    page: pageNum,
  });
});

// GET /admin/games/live-bets
router.get("/admin/games/live-bets", authenticateAdmin, async (req, res): Promise<void> => {
  // Get most recent upcoming/live game
  const [currentGame] = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.status, "upcoming"))
    .orderBy(desc(gamesTable.scheduledAt))
    .limit(1);

  if (!currentGame) {
    res.json({
      totalBets: 0,
      totalAmount: 0,
      colorBets: { red: { count: 0, amount: 0, potentialPayout: 0 }, yellow: { count: 0, amount: 0, potentialPayout: 0 }, green: { count: 0, amount: 0, potentialPayout: 0 } },
      numberBets: Array.from({ length: 10 }, (_, i) => ({ number: i, count: 0, amount: 0, potentialPayout: 0 })),
    });
    return;
  }

  const allBets = await db.select().from(betsTable).where(eq(betsTable.gameId, currentGame.id));

  const colorBets: Record<string, { count: number; amount: number; potentialPayout: number }> = {
    red: { count: 0, amount: 0, potentialPayout: 0 },
    yellow: { count: 0, amount: 0, potentialPayout: 0 },
    green: { count: 0, amount: 0, potentialPayout: 0 },
  };

  const numberBets: Record<number, { count: number; amount: number; potentialPayout: number }> = {};
  for (let i = 0; i <= 9; i++) {
    numberBets[i] = { count: 0, amount: 0, potentialPayout: 0 };
  }

  for (const bet of allBets) {
    const amount = Number(bet.amount);
    const payout = Number(bet.potentialWin);
    if (bet.betType === "color" && colorBets[bet.selection]) {
      colorBets[bet.selection].count++;
      colorBets[bet.selection].amount += amount;
      colorBets[bet.selection].potentialPayout += payout;
    } else if (bet.betType === "number") {
      const num = parseInt(bet.selection, 10);
      if (!isNaN(num) && numberBets[num] !== undefined) {
        numberBets[num].count++;
        numberBets[num].amount += amount;
        numberBets[num].potentialPayout += payout;
      }
    }
  }

  const totalAmount = allBets.reduce((s, b) => s + Number(b.amount), 0);

  res.json({
    gameId: currentGame.id,
    totalBets: allBets.length,
    totalAmount,
    colorBets,
    numberBets: Object.entries(numberBets).map(([num, stats]) => ({ number: parseInt(num, 10), ...stats })),
  });
});

// GET /admin/games/preset-result
router.get("/admin/games/preset-result", authenticateAdmin, async (_req, res): Promise<void> => {
  const settings = await db.select().from(gameSettingsTable).where(
    sql`${gameSettingsTable.key} IN ('preset_color', 'preset_number')`
  );
  const preset: Record<string, string> = {};
  for (const s of settings) preset[s.key] = s.value;

  const [currentGame] = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.status, "upcoming"))
    .orderBy(desc(gamesTable.scheduledAt))
    .limit(1);

  res.json({
    presetColor: preset.preset_color || null,
    presetNumber: preset.preset_number !== undefined ? parseInt(preset.preset_number, 10) : null,
    currentGameId: currentGame?.id || null,
  });
});

// POST /admin/games/preset-result
router.post("/admin/games/preset-result", authenticateAdmin, async (req, res): Promise<void> => {
  const adminId = (req as any).admin.id;
  const { presetColor, presetNumber } = req.body;

  if (presetColor) {
    await db.insert(gameSettingsTable)
      .values({ key: "preset_color", value: presetColor })
      .onConflictDoUpdate({ target: gameSettingsTable.key, set: { value: presetColor, updatedAt: new Date() } });
  }
  if (presetNumber !== undefined && presetNumber !== null) {
    await db.insert(gameSettingsTable)
      .values({ key: "preset_number", value: String(presetNumber) })
      .onConflictDoUpdate({ target: gameSettingsTable.key, set: { value: String(presetNumber), updatedAt: new Date() } });
  }

  await logAudit(adminId, "preset_result", `Preset: ${presetColor} #${presetNumber}`, undefined);
  res.json({ message: "Preset saved", success: true });
});

// POST /admin/games/declare-result
router.post("/admin/games/declare-result", authenticateAdmin, async (req, res): Promise<void> => {
  const adminId = (req as any).admin.id;
  const { gameId, winningColor, winningNumber, isAuto } = req.body;

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, gameId));
  if (!game) {
    res.status(404).json({ message: "Game not found", success: false });
    return;
  }

  // Get all bets for this game
  const allBets = await db.select().from(betsTable).where(eq(betsTable.gameId, gameId));

  let totalPayout = 0;

  // Process each bet
  for (const bet of allBets) {
    let won = false;
    if (bet.betType === "color" && bet.selection === winningColor) won = true;
    if (bet.betType === "number" && parseInt(bet.selection, 10) === winningNumber) won = true;

    if (won) {
      const winAmount = Number(bet.potentialWin);
      totalPayout += winAmount;

      // Credit winner
      await db.update(usersTable).set({
        walletBalance: sql`${usersTable.walletBalance} + ${winAmount}`,
      }).where(eq(usersTable.id, bet.userId));

      await db.update(walletsTable).set({
        balance: sql`${walletsTable.balance} + ${winAmount}`,
        totalWon: sql`${walletsTable.totalWon} + ${winAmount}`,
      }).where(eq(walletsTable.userId, bet.userId));

      await db.insert(transactionsTable).values({
        userId: bet.userId,
        type: "win",
        amount: String(winAmount),
        status: "completed",
      });

      await db.update(betsTable).set({ status: "won" }).where(eq(betsTable.id, bet.id));
    } else {
      await db.update(betsTable).set({ status: "lost" }).where(eq(betsTable.id, bet.id));
      await db.update(walletsTable).set({
        totalLost: sql`${walletsTable.totalLost} + ${bet.amount}`,
      }).where(eq(walletsTable.userId, bet.userId));
    }
  }

  // Update game
  await db.update(gamesTable).set({
    winningColor,
    winningNumber,
    status: "closed",
    declaredBy: isAuto ? "auto" : String(adminId),
    totalPayout: String(totalPayout),
  }).where(eq(gamesTable.id, gameId));

  await logAudit(adminId, "declare_result", `Game ${gameId}: ${winningColor} #${winningNumber}, payout ₹${totalPayout}`, req.ip);

  res.json({ message: "Result declared and winnings distributed", success: true });
});

// GET /admin/deposits
router.get("/admin/deposits", authenticateAdmin, async (req, res): Promise<void> => {
  const { status, page = "1" } = req.query as any;
  const pageNum = parseInt(page, 10);
  const limit = 20;
  const offset = (pageNum - 1) * limit;

  const txs = await db
    .select({
      id: transactionsTable.id,
      userId: transactionsTable.userId,
      type: transactionsTable.type,
      amount: transactionsTable.amount,
      status: transactionsTable.status,
      referenceId: transactionsTable.referenceId,
      screenshotUrl: transactionsTable.screenshotUrl,
      reason: transactionsTable.reason,
      createdAt: transactionsTable.createdAt,
      userName: usersTable.name,
      userMobile: usersTable.mobile,
    })
    .from(transactionsTable)
    .leftJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
    .where(and(
      eq(transactionsTable.type, "deposit"),
      ...(status ? [eq(transactionsTable.status, status)] : [])
    ))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactionsTable)
    .where(eq(transactionsTable.type, "deposit"));

  res.json({
    transactions: txs.map((t) => ({
      id: t.id,
      userId: t.userId,
      type: t.type,
      amount: Number(t.amount),
      status: t.status,
      referenceId: t.referenceId,
      screenshotUrl: t.screenshotUrl,
      reason: t.reason,
      createdAt: t.createdAt,
      userName: t.userName,
      userMobile: t.userMobile,
    })),
    total: Number(totalResult?.count || 0),
    page: pageNum,
    limit,
  });
});

// PUT /admin/deposits/:txId/approve
router.put("/admin/deposits/:txId/approve", authenticateAdmin, async (req, res): Promise<void> => {
  const adminId = (req as any).admin.id;
  const raw = Array.isArray(req.params.txId) ? req.params.txId[0] : req.params.txId;
  const txId = parseInt(raw, 10);
  const { action, reason } = req.body;

  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId));
  if (!tx) {
    res.status(404).json({ message: "Transaction not found", success: false });
    return;
  }

  if (action === "approve") {
    await db.update(transactionsTable).set({ status: "approved" }).where(eq(transactionsTable.id, txId));

    // Credit user wallet
    const amount = Number(tx.amount);
    await db.update(usersTable).set({
      walletBalance: sql`${usersTable.walletBalance} + ${amount}`,
    }).where(eq(usersTable.id, tx.userId));

    await db.update(walletsTable).set({
      balance: sql`${walletsTable.balance} + ${amount}`,
      totalDeposited: sql`${walletsTable.totalDeposited} + ${amount}`,
    }).where(eq(walletsTable.userId, tx.userId));

    await logAudit(adminId, "approve_deposit", `Deposit ${txId} approved ₹${amount}`, req.ip);
  } else {
    await db.update(transactionsTable).set({ status: "rejected", reason }).where(eq(transactionsTable.id, txId));
    // Refund is not needed as deposit was never credited
    await logAudit(adminId, "reject_deposit", `Deposit ${txId} rejected: ${reason}`, req.ip);
  }

  res.json({ message: `Deposit ${action}d successfully`, success: true });
});

// GET /admin/withdrawals
router.get("/admin/withdrawals", authenticateAdmin, async (req, res): Promise<void> => {
  const { status, page = "1" } = req.query as any;
  const pageNum = parseInt(page, 10);
  const limit = 20;
  const offset = (pageNum - 1) * limit;

  const txs = await db
    .select({
      id: transactionsTable.id,
      userId: transactionsTable.userId,
      type: transactionsTable.type,
      amount: transactionsTable.amount,
      status: transactionsTable.status,
      referenceId: transactionsTable.referenceId,
      screenshotUrl: transactionsTable.screenshotUrl,
      reason: transactionsTable.reason,
      createdAt: transactionsTable.createdAt,
      userName: usersTable.name,
      userMobile: usersTable.mobile,
    })
    .from(transactionsTable)
    .leftJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
    .where(and(
      eq(transactionsTable.type, "withdrawal"),
      ...(status ? [eq(transactionsTable.status, status)] : [])
    ))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactionsTable)
    .where(eq(transactionsTable.type, "withdrawal"));

  res.json({
    transactions: txs.map((t) => ({
      id: t.id,
      userId: t.userId,
      type: t.type,
      amount: Number(t.amount),
      status: t.status,
      referenceId: t.referenceId,
      screenshotUrl: t.screenshotUrl,
      reason: t.reason,
      createdAt: t.createdAt,
      userName: t.userName,
      userMobile: t.userMobile,
    })),
    total: Number(totalResult?.count || 0),
    page: pageNum,
    limit,
  });
});

// PUT /admin/withdrawals/:txId/approve
router.put("/admin/withdrawals/:txId/approve", authenticateAdmin, async (req, res): Promise<void> => {
  const adminId = (req as any).admin.id;
  const raw = Array.isArray(req.params.txId) ? req.params.txId[0] : req.params.txId;
  const txId = parseInt(raw, 10);
  const { action, reason } = req.body;

  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId));
  if (!tx) {
    res.status(404).json({ message: "Transaction not found", success: false });
    return;
  }

  if (action === "approve") {
    await db.update(transactionsTable).set({ status: "completed" }).where(eq(transactionsTable.id, txId));

    await db.update(walletsTable).set({
      totalWithdrawn: sql`${walletsTable.totalWithdrawn} + ${tx.amount}`,
    }).where(eq(walletsTable.userId, tx.userId));

    await logAudit(adminId, "approve_withdrawal", `Withdrawal ${txId} approved ₹${tx.amount}`, req.ip);
  } else {
    // Refund on rejection
    const amount = Number(tx.amount);
    await db.update(transactionsTable).set({ status: "rejected", reason }).where(eq(transactionsTable.id, txId));
    await db.update(usersTable).set({
      walletBalance: sql`${usersTable.walletBalance} + ${amount}`,
    }).where(eq(usersTable.id, tx.userId));
    await db.update(walletsTable).set({
      balance: sql`${walletsTable.balance} + ${amount}`,
    }).where(eq(walletsTable.userId, tx.userId));

    await logAudit(adminId, "reject_withdrawal", `Withdrawal ${txId} rejected: ${reason}`, req.ip);
  }

  res.json({ message: `Withdrawal ${action}d`, success: true });
});

// GET /admin/upi-settings
router.get("/admin/upi-settings", authenticateAdmin, async (req, res): Promise<void> => {
  const settings = await db.select().from(upiSettingsTable).orderBy(upiSettingsTable.displayOrder);
  res.json({ settings });
});

// POST /admin/upi-settings
router.post("/admin/upi-settings", authenticateAdmin, async (req, res): Promise<void> => {
  const adminId = (req as any).admin.id;
  const { upiId, qrImageUrl, isActive, displayOrder, userRangeStart, userRangeEnd } = req.body;

  const [setting] = await db.insert(upiSettingsTable).values({
    upiId,
    qrImageUrl,
    isActive: isActive ?? true,
    displayOrder: displayOrder ?? 0,
    userRangeStart,
    userRangeEnd,
  }).returning();

  await logAudit(adminId, "add_upi", `Added UPI: ${upiId}`, req.ip);
  res.status(201).json(setting);
});

// PUT /admin/upi-settings/:settingId
router.put("/admin/upi-settings/:settingId", authenticateAdmin, async (req, res): Promise<void> => {
  const adminId = (req as any).admin.id;
  const raw = Array.isArray(req.params.settingId) ? req.params.settingId[0] : req.params.settingId;
  const settingId = parseInt(raw, 10);
  const { upiId, qrImageUrl, isActive, displayOrder, userRangeStart, userRangeEnd } = req.body;

  const [setting] = await db.update(upiSettingsTable)
    .set({ upiId, qrImageUrl, isActive, displayOrder, userRangeStart, userRangeEnd })
    .where(eq(upiSettingsTable.id, settingId))
    .returning();

  await logAudit(adminId, "update_upi", `Updated UPI: ${upiId}`, req.ip);
  res.json(setting);
});

// DELETE /admin/upi-settings/:settingId
router.delete("/admin/upi-settings/:settingId", authenticateAdmin, async (req, res): Promise<void> => {
  const adminId = (req as any).admin.id;
  const raw = Array.isArray(req.params.settingId) ? req.params.settingId[0] : req.params.settingId;
  const settingId = parseInt(raw, 10);

  await db.delete(upiSettingsTable).where(eq(upiSettingsTable.id, settingId));
  await logAudit(adminId, "delete_upi", `Deleted UPI setting ${settingId}`, req.ip);
  res.json({ message: "UPI setting deleted", success: true });
});

// GET /admin/referrals
router.get("/admin/referrals", authenticateAdmin, async (req, res): Promise<void> => {
  const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(referralEarningsTable);
  const [commissionResult] = await db.select({ total: sql<number>`sum(amount)` }).from(referralEarningsTable).where(eq(referralEarningsTable.status, "paid"));

  const topReferrers = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt))
    .limit(10);

  res.json({
    totalReferrals: Number(totalResult?.count || 0),
    totalCommissionPaid: Number(commissionResult?.total || 0),
    topReferrers: topReferrers.map((u) => ({
      id: u.id,
      name: u.name,
      mobile: u.mobile,
      joinedAt: u.createdAt,
      totalBets: 0,
      commissionEarned: 0,
    })),
  });
});

// GET /admin/analytics
router.get("/admin/analytics", authenticateAdmin, async (req, res): Promise<void> => {
  const { period = "today" } = req.query as any;

  const now = new Date();
  let startDate = new Date();
  if (period === "week") startDate.setDate(now.getDate() - 7);
  else if (period === "month") startDate.setDate(now.getDate() - 30);
  else startDate.setHours(0, 0, 0, 0);

  const txs = await db
    .select()
    .from(transactionsTable)
    .where(gte(transactionsTable.createdAt, startDate));

  const collection = txs.filter((t) => t.type === "bet").reduce((s, t) => s + Number(t.amount), 0);
  const payout = txs.filter((t) => t.type === "win").reduce((s, t) => s + Number(t.amount), 0);

  // Color popularity
  const allBets = await db.select().from(betsTable).where(gte(betsTable.createdAt, startDate));
  const colorCounts = { red: 0, yellow: 0, green: 0 };
  for (const bet of allBets) {
    if (bet.betType === "color" && colorCounts[bet.selection as keyof typeof colorCounts] !== undefined) {
      colorCounts[bet.selection as keyof typeof colorCounts] += Number(bet.amount);
    }
  }

  const topBettors = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.walletBalance))
    .limit(5);

  res.json({
    period,
    totalCollection: collection,
    totalPayout: payout,
    totalProfit: collection - payout,
    colorPopularity: colorCounts,
    dailyStats: [{ date: startDate.toISOString().split("T")[0], collection, payout, users: 0 }],
    topBettors: topBettors.map((u) => ({
      id: u.id,
      name: u.name,
      mobile: u.mobile,
      referralCode: u.referralCode,
      kycStatus: u.kycStatus,
      isBlocked: u.isBlocked,
      walletBalance: Number(u.walletBalance),
      createdAt: u.createdAt,
    })),
  });
});

// GET /admin/game-settings
router.get("/admin/game-settings", authenticateAdmin, async (req, res): Promise<void> => {
  const settings = await db.select().from(gameSettingsTable);
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;

  res.json({
    minBetAmount: Number(map["minBetAmount"] || "10"),
    maxBetAmount: Number(map["maxBetAmount"] || "10000"),
    colorMultiplier: Number(map["colorMultiplier"] || "2"),
    numberMultiplier: Number(map["numberMultiplier"] || "9"),
    bettingWindowMinutes: Number(map["bettingWindowMinutes"] || "5"),
    minDeposit: Number(map["minDeposit"] || "100"),
    minWithdrawal: Number(map["minWithdrawal"] || "100"),
    signupBonus: Number(map["signupBonus"] || "25"),
    referrerBonus: Number(map["referrerBonus"] || "50"),
    bettingCommission: Number(map["bettingCommission"] || "1"),
    level2Commission: Number(map["level2Commission"] || "0.5"),
  });
});

// PUT /admin/game-settings
router.put("/admin/game-settings", authenticateAdmin, async (req, res): Promise<void> => {
  const adminId = (req as any).admin.id;
  const settings = req.body;

  for (const [key, value] of Object.entries(settings)) {
    const existing = await db.select().from(gameSettingsTable).where(eq(gameSettingsTable.key, key));
    if (existing.length > 0) {
      await db.update(gameSettingsTable).set({ value: String(value) }).where(eq(gameSettingsTable.key, key));
    } else {
      await db.insert(gameSettingsTable).values({ key, value: String(value) });
    }
  }

  await logAudit(adminId, "update_game_settings", "Game settings updated", req.ip);
  res.json(settings);
});

// GET /admin/audit-logs
router.get("/admin/audit-logs", authenticateAdmin, async (req, res): Promise<void> => {
  const { page = "1" } = req.query as any;
  const pageNum = parseInt(page, 10);
  const limit = 50;
  const offset = (pageNum - 1) * limit;

  const logs = await db
    .select({
      id: auditLogsTable.id,
      adminId: auditLogsTable.adminId,
      action: auditLogsTable.action,
      details: auditLogsTable.details,
      ipAddress: auditLogsTable.ipAddress,
      createdAt: auditLogsTable.createdAt,
      adminName: adminUsersTable.username,
    })
    .from(auditLogsTable)
    .leftJoin(adminUsersTable, eq(auditLogsTable.adminId, adminUsersTable.id))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(auditLogsTable);

  res.json({
    logs: logs.map((l) => ({
      id: l.id,
      adminId: l.adminId,
      adminName: l.adminName || "Admin",
      action: l.action,
      details: l.details,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
    })),
    total: Number(totalResult?.count || 0),
    page: pageNum,
  });
});

export default router;
