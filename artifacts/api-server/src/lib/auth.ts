import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.SESSION_SECRET || "3batti-secret-key";
const JWT_REFRESH_SECRET = process.env.SESSION_SECRET + "-refresh" || "3batti-refresh-secret";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateAccessToken(payload: { id: number; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function generateRefreshToken(payload: { id: number }): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "30d" });
}

export function verifyAccessToken(token: string): { id: number; role?: string } {
  return jwt.verify(token, JWT_SECRET) as { id: number; role?: string };
}

export function verifyRefreshToken(token: string): { id: number } {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { id: number };
}

export function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
