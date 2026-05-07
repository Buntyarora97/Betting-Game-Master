import { Router } from "express";
import { db } from "@workspace/db";
import { gamesTable, betsTable, usersTable, walletsTable, transactionsTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

// Game schedule times (IST - stored as UTC offsets)
const GAME_HOURS_IST = [9, 13, 17, 21]; // 9AM, 1PM, 5PM, 9PM

function getNextGameTime(): Date {
  const now = new Date();
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const istHour = istNow.getUTCHours();
  const istMinute = istNow.getUTCMinutes();

  for (const hour of GAME_HOURS_IST) {
    if (hour > istHour || (hour === istHour && istMinute < 55)) {
      const next = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), hour, 0, 0) - istOffset);
      return next;
    }
  }
  // Next day 9AM
  const tomorrow = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() + 1, 9, 0, 0) - istOffset);
  return tomorrow;
}

// GET /game/current
router.get("/game/current", async (req, res): Promise<void> => {
  const nextGameAt = getNextGameTime();
  const secondsUntilNext = Math.max(0, Math.floor((nextGameAt.getTime() - Date.now()) / 1000));

  // Get last closed game
  const [lastGame] = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.status, "closed"))
    .orderBy(desc(gamesTable.scheduledAt))
    .limit(1);

  // Get current live game if any
  const [liveGame] = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.status, "live"))
    .limit(1);

  res.json({
    currentGame: liveGame || null,
    nextGameAt: nextGameAt.toISOString(),
    secondsUntilNext,
    lastResult: lastGame || null,
    schedule: GAME_HOURS_IST.map((h) => `${h}:00`),
  });
});

// GET /game/results
router.get("/game/results", async (req, res): Promise<void> => {
  const { page = "1" } = req.query as any;
  const pageNum = parseInt(page, 10);
  const limit = 50;
  const offset = (pageNum - 1) * limit;

  const results = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.status, "closed"))
    .orderBy(desc(gamesTable.scheduledAt))
    .limit(limit)
    .offset(offset);

  res.json({
    results: results.map((g) => ({
      id: g.id,
      scheduledAt: g.scheduledAt,
      status: g.status,
      winningColor: g.winningColor,
      winningNumber: g.winningNumber,
      totalCollection: Number(g.totalCollection),
      totalPayout: Number(g.totalPayout),
      createdAt: g.createdAt,
    })),
    total: results.length,
  });
});

// POST /game/place-bet
router.post("/game/place-bet", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user.id;
  const { gameId, betType, selection, amount } = req.body;

  if (!gameId || !betType || !selection || !amount) {
    res.status(400).json({ message: "All fields required", success: false });
    return;
  }

  if (amount < 10) {
    res.status(400).json({ message: "Minimum bet is ₹10", success: false });
    return;
  }

  // Check game exists and is live or upcoming
  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, gameId));
  if (!game || game.status === "closed") {
    res.status(400).json({ message: "Game is not available for betting", success: false });
    return;
  }

  // Check user wallet
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || Number(user.walletBalance) < amount) {
    res.status(400).json({ message: "Insufficient wallet balance", success: false });
    return;
  }

  // Calculate potential win
  let potentialWin = 0;
  if (betType === "color") {
    potentialWin = amount * 2;
  } else if (betType === "number") {
    potentialWin = amount * 9;
  }

  // Deduct from wallet
  await db.update(usersTable).set({
    walletBalance: sql`${usersTable.walletBalance} - ${amount}`,
  }).where(eq(usersTable.id, userId));

  await db.update(walletsTable).set({
    balance: sql`${walletsTable.balance} - ${amount}`,
  }).where(eq(walletsTable.userId, userId));

  // Update game collection
  await db.update(gamesTable).set({
    totalCollection: sql`${gamesTable.totalCollection} + ${amount}`,
  }).where(eq(gamesTable.id, gameId));

  // Record transaction
  await db.insert(transactionsTable).values({
    userId,
    type: "bet",
    amount: String(amount),
    status: "completed",
  });

  // Create bet
  const [bet] = await db.insert(betsTable).values({
    userId,
    gameId,
    betType,
    selection: String(selection),
    amount: String(amount),
    potentialWin: String(potentialWin),
    status: "pending",
  }).returning();

  res.status(201).json({
    id: bet.id,
    userId: bet.userId,
    gameId: bet.gameId,
    betType: bet.betType,
    selection: bet.selection,
    amount: Number(bet.amount),
    potentialWin: Number(bet.potentialWin),
    status: bet.status,
    createdAt: bet.createdAt,
  });
});

// GET /user/bets
router.get("/user/bets", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user.id;
  const { page = "1", gameId } = req.query as any;
  const pageNum = parseInt(page, 10);
  const limit = 20;
  const offset = (pageNum - 1) * limit;

  const bets = await db
    .select()
    .from(betsTable)
    .where(eq(betsTable.userId, userId))
    .orderBy(desc(betsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    bets: bets.map((b) => ({
      id: b.id,
      userId: b.userId,
      gameId: b.gameId,
      betType: b.betType,
      selection: b.selection,
      amount: Number(b.amount),
      potentialWin: Number(b.potentialWin),
      status: b.status,
      createdAt: b.createdAt,
    })),
    total: bets.length,
    page: pageNum,
  });
});

export default router;
