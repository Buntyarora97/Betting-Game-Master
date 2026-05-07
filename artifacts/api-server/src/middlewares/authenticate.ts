import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/auth.js";

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized", success: false });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyAccessToken(token);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token", success: false });
  }
}

export function authenticateAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized", success: false });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyAccessToken(token);
    if (decoded.role !== "admin" && decoded.role !== "super_admin") {
      res.status(403).json({ message: "Forbidden", success: false });
      return;
    }
    (req as any).admin = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token", success: false });
  }
}
