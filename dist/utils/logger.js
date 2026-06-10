"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.logEvent = void 0;
const formatMeta = (meta) => {
    if (!meta || Object.keys(meta).length === 0)
        return "";
    try {
        return ` ${JSON.stringify(meta)}`;
    }
    catch {
        return "";
    }
};
const logEvent = (message, meta) => {
    const ts = new Date().toISOString();
    // eslint-disable-next-line no-console
    console.log(`[${ts}] ${message}${formatMeta(meta)}`);
};
exports.logEvent = logEvent;
const requestLogger = (req, res, next) => {
    const start = process.hrtime.bigint();
    const getUserMeta = () => {
        if (!req.user)
            return undefined;
        return {
            userId: req.user.id,
            email: req.user.email,
            name: req.user.name,
        };
    };
    res.on("finish", () => {
        const end = process.hrtime.bigint();
        const ms = Number(end - start) / 1000000;
        (0, exports.logEvent)("HTTP", {
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
exports.requestLogger = requestLogger;
