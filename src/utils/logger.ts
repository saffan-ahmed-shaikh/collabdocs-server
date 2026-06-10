import type { NextFunction, Request, Response } from "express";

type LogMeta = Record<string, unknown>;

const formatMeta = (meta?: LogMeta) => {
  if (!meta || Object.keys(meta).length === 0) return "";
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return "";
  }
};

export const logEvent = (message: string, meta?: LogMeta) => {
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[${ts}] ${message}${formatMeta(meta)}`);
};

export const requestLogger = (
  req: Request & { user?: { id?: string; email?: string; name?: string } },
  res: Response,
  next: NextFunction,
) => {
  const start = process.hrtime.bigint();

  const getUserMeta = () => {
    if (!req.user) return undefined;
    return {
      userId: req.user.id,
      email: req.user.email,
      name: req.user.name,
    };
  };

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1_000_000;

    logEvent("HTTP", {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Number(ms.toFixed(2)),
      user: getUserMeta(),
      // Keeping body out intentionally to avoid sensitive logs
    });
  });

  next();
};
