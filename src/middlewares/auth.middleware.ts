import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logEvent } from "../utils/logger";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logEvent("auth:missing_token", {
        method: req.method,
        path: req.originalUrl,
      });
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      email: string;
      name: string;
    };

    req.user = decoded;

    logEvent("auth:success", {
      userId: decoded.id,
      email: decoded.email,
      name: decoded.name,
    });

    next();
  } catch (err) {
    logEvent("auth:failed", {
      method: req.method,
      path: req.originalUrl,
    });
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
