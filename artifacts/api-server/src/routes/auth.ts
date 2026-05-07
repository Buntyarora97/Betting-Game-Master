import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  walletsTable,
  adminUsersTable,
  auditLogsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  generateReferralCode,
  generateOtp,
  verifyRefreshToken,
} from "../lib/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

// POST /auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const { mobile, name, mpin, referralCode } = req.body;

  if (!mobile || !name || !mpin) {
    res.status(400).json({ message: "mobile, name, mpin are required", success: false });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.mobile, mobile));
  if (existing.length > 0) {
    res.status(409).json({ message: "Mobile already registered", success: false });
    return;
  }

  const newReferralCode = generateReferralCode();
  const mpinHash = hashPassword(mpin);

  let referredById: number | undefined;
  if (referralCode) {
    const [referrer] = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode));
    if (referrer) referredById = referrer.id;
  }

  const [user] = await db.insert(usersTable).values({
    mobile,
    name,
    mpinHash,
    referralCode: newReferralCode,
    referredBy: referredById,
    isVerified: true,
    walletBalance: referredById ? "25" : "0",
  }).returning();

  await db.insert(walletsTable).values({
    userId: user.id,
    balance: referredById ? "25" : "0",
  });

  const accessToken = generateAccessToken({ id: user.id });
  const refreshToken = generateRefreshToken({ id: user.id });

  await db.update(usersTable).set({ refreshToken }).where(eq(usersTable.id, user.id));

  res.status(201).json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      referralCode: user.referralCode,
      kycStatus: user.kycStatus,
      isBlocked: user.isBlocked,
      walletBalance: Number(user.walletBalance),
      createdAt: user.createdAt,
    },
  });
});

// POST /auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const { mobile, mpin } = req.body;
  if (!mobile || !mpin) {
    res.status(400).json({ message: "mobile and mpin required", success: false });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.mobile, mobile));
  if (!user) {
    res.status(401).json({ message: "Invalid credentials", success: false });
    return;
  }

  if (user.isBlocked) {
    res.status(403).json({ message: "Account is blocked", success: false });
    return;
  }

  if (!comparePassword(mpin, user.mpinHash)) {
    res.status(401).json({ message: "Invalid MPIN", success: false });
    return;
  }

  const accessToken = generateAccessToken({ id: user.id });
  const refreshToken = generateRefreshToken({ id: user.id });
  await db.update(usersTable).set({ refreshToken }).where(eq(usersTable.id, user.id));

  res.json({
    accessToken,
    refreshToken,
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
  });
});

// POST /auth/verify-otp (simplified - auto-verify for demo)
router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  res.json({ message: "OTP verified", success: true });
});

// POST /auth/reset-mpin
router.post("/auth/reset-mpin", async (req, res): Promise<void> => {
  const { mobile, otp, newMpin } = req.body;
  if (!mobile || !newMpin) {
    res.status(400).json({ message: "mobile and newMpin required", success: false });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.mobile, mobile));
  if (!user) {
    res.status(404).json({ message: "User not found", success: false });
    return;
  }

  await db.update(usersTable).set({ mpinHash: hashPassword(newMpin) }).where(eq(usersTable.id, user.id));
  res.json({ message: "MPIN reset successfully", success: true });
});

// POST /auth/refresh-token
router.post("/auth/refresh-token", async (req, res): Promise<void> => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ message: "refreshToken required", success: false });
    return;
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decoded.id));
    if (!user) {
      res.status(401).json({ message: "User not found", success: false });
      return;
    }
    const newAccessToken = generateAccessToken({ id: user.id });
    res.json({
      accessToken: newAccessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        referralCode: user.referralCode,
        kycStatus: user.kycStatus,
        isBlocked: user.isBlocked,
        walletBalance: Number(user.walletBalance),
        createdAt: user.createdAt,
      },
    });
  } catch {
    res.status(401).json({ message: "Invalid refresh token", success: false });
  }
});

// POST /auth/admin/login
router.post("/auth/admin/login", async (req, res): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ message: "username and password required", success: false });
    return;
  }

  const [admin] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.username, username));
  if (!admin) {
    res.status(401).json({ message: "Invalid credentials", success: false });
    return;
  }

  if (!comparePassword(password, admin.passwordHash)) {
    res.status(401).json({ message: "Invalid credentials", success: false });
    return;
  }

  await db.update(adminUsersTable).set({ lastLogin: new Date() }).where(eq(adminUsersTable.id, admin.id));

  const accessToken = generateAccessToken({ id: admin.id, role: admin.role });

  res.json({
    accessToken,
    refreshToken: accessToken,
    user: {
      id: admin.id,
      name: admin.username,
      mobile: "",
      referralCode: "",
      kycStatus: "verified",
      isBlocked: false,
      walletBalance: 0,
      createdAt: admin.createdAt,
    },
  });
});

export default router;
