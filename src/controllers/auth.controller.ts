import { Request, Response } from "express";
import * as AuthService from "../services/auth.service";
import { logEvent } from "../utils/logger";

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const result = await AuthService.registerUser(name, email, password);

    const resultAny = result as any;
    logEvent("auth:register_success", {
      email,
      userId: resultAny?.user?.id ?? resultAny?.id,
    });

    res.status(201).json({ message: "Registration successful", ...result });
  } catch (err: any) {
    if (err.message === "EMAIL_EXISTS") {
      logEvent("auth:register_conflict", { email: req.body?.email });
      return res.status(409).json({ message: "Email already registered" });
    }
    logEvent("auth:register_failed", { error: err?.message ?? "unknown" });
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const result = await AuthService.loginUser(email, password);

    const resultAny = result as any;
    logEvent("auth:login_success", {
      email,
      userId: resultAny?.user?.id ?? resultAny?.id,
    });

    res.json({ message: "Login successful", ...result });
  } catch (err: any) {
    if (err.message === "INVALID_CREDENTIALS") {
      logEvent("auth:login_failed_invalid_credentials", {
        email: req.body?.email,
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }
    logEvent("auth:login_failed", { error: err?.message ?? "unknown" });
    res.status(500).json({ message: "Internal server error" });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(401).json({ message: "Refresh token required" });

    const tokens = await AuthService.refreshUserToken(refreshToken);

    // Avoid logging refresh token value.
    const tokensAny = tokens as any;
    logEvent("auth:refresh_success", {
      userId: tokensAny?.user?.id ?? tokensAny?.id,
    });

    res.json(tokens);
  } catch {
    logEvent("auth:refresh_failed", { reason: "invalid_refresh_token" });
    res.status(401).json({ message: "Invalid refresh token" });
  }
};
